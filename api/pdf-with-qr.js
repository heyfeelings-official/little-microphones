/**
 * api/pdf-with-qr.js - Dynamic PDF Generation with QR Codes
 * 
 * PURPOSE: Generates PDF files with embedded QR codes containing ShareID links
 * DEPENDENCIES: pdf-lib, qrcode, Supabase, Memberstack utilities
 * 
 * REQUEST FORMAT:
 * GET /api/pdf-with-qr?item=workbook-slug&world=Shopping%20Spree
 * 
 * RESPONSE: PDF file with embedded QR code
 * 
 * LOGIC:
 * 1. Validate educator session (Memberstack)
 * 2. Decode and validate world parameter
 * 3. Find educator's LMID for the specified world
 * 4. Get ShareID for that LMID+world combination
 * 5. Fetch base PDF from Webflow CMS
 * 6. Generate QR code with ShareID URL
 * 7. Embed QR code in PDF and return modified PDF
 */

import { PDFDocument, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { WORLDS, getWorldColumn } from '../utils/lmid-utils.js';
import { getMemberFromSession } from '../utils/memberstack-utils.js';
import { findLmidsByMemberId } from '../utils/database-utils.js';
import { getWebflowItem, checkDynamicQR, getTemplatePdfUrl, getStaticPdfUrl } from '../utils/webflow-api.js';

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['GET', 'OPTIONS']);
    corsHandler(req);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use GET.' 
        });
    }

    try {
        const { item, world, check, lang } = req.query;

        // Validate required parameters
        if (!item) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: item' 
            });
        }

        if (!world) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: world' 
            });
        }

        // Language detection: priority to query parameter, fallback to referer
        let detectedLang = lang || 'en';
        
        if (!lang) {
            const referer = req.headers.referer || req.headers.referrer || '';
            if (referer.includes('/pl/')) {
                detectedLang = 'pl';
            }
        }

        // Normalize world name: handle spaces, case, and convert to kebab-case
        const rawWorld = decodeURIComponent(world);
        const normalizedWorld = rawWorld
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-') // Convert spaces to hyphens
            .replace(/[^a-z0-9-]/g, ''); // Remove special characters
        
        // PDF generation request initiated
        console.time('🚀 Total PDF generation time');

        // Validate world name
        if (!WORLDS.includes(normalizedWorld)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid world. Must be one of: ${WORLDS.join(', ')}. Received: ${rawWorld} (normalized: ${normalizedWorld})` 
            });
        }

        // PERFORMANCE OPTIMIZATION: Parallel execution of independent operations
        console.time('⚡ Parallel API calls');
        
        // Start all independent API calls in parallel
        const [webflowItem, member] = await Promise.all([
            // Webflow CMS API call
            getWebflowItem(item, detectedLang),
            // Memberstack session data (for teacher name in PDF)
            getMemberFromSession(req)
        ]);
        
        console.timeEnd('⚡ Parallel API calls');
        
        if (!webflowItem) {
            // Don't log as error - this is normal for items not in CMS
            if (check === 'true') {
                console.log(`ℹ️ Item not in CMS (normal): ${item}`);
            } else {
                console.log(`⚠️ PDF generation attempted for non-existent item: ${item}`);
            }
            return res.status(404).json({ 
                success: false, 
                error: 'Workbook item not found in CMS' 
            });
        }

        // If this is just a check request, return Dynamic QR status immediately
        if (check === 'true') {
            return res.status(200).json({
                success: true,
                needsDynamicQR: checkDynamicQR(webflowItem),
                item: webflowItem.slug,
                world: webflowItem.world
            });
        }

        // Authentication handled by Memberstack at page level - no additional check needed

        console.log('👨‍🏫 Educator session:', member ? `ID: ${member.id}` : 'No session data');

        // Early return for check requests (frontend button validation)
        if (check === 'true') {
            return res.status(200).json({
                success: true,
                dynamicQR: checkDynamicQR(webflowItem),
                item: webflowItem.slug,
                world: webflowItem.world
            });
        }

        // Check if Dynamic QR is enabled - early exit for static PDFs
        if (!checkDynamicQR(webflowItem)) {
            console.log('🔄 Dynamic QR disabled, redirecting to base PDF file');
            const templatePdfUrl = getTemplatePdfUrl(webflowItem);
            if (templatePdfUrl) {
                console.log('📄 Redirecting to Template PDF:', templatePdfUrl);
                return res.redirect(302, templatePdfUrl);
            } else {
                const staticPdfUrl = getStaticPdfUrl(webflowItem);
                if (staticPdfUrl) {
                    console.log('📄 Redirecting to Static PDF:', staticPdfUrl);
                    return res.redirect(302, staticPdfUrl);
                } else {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'No PDF link available for this item' 
                    });
                }
            }
        }

        // World validation
        let worldToUse = normalizedWorld;
        if (!worldToUse && webflowItem.world) {
            worldToUse = webflowItem.world
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
        }
        
        if (!worldToUse || !WORLDS.includes(worldToUse)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid world: ${worldToUse}. Must be one of: ${WORLDS.join(', ')}` 
            });
        }

        // Get Template PDF URL early for parallel download
        const templatePdfUrl = getTemplatePdfUrl(webflowItem);
        if (!templatePdfUrl) {
            return res.status(404).json({ 
                success: false, 
                error: 'Template PDF not found for this item' 
            });
        }

        console.log('📄 Template PDF URL from CMS:', templatePdfUrl);
        console.log('🔄 Using cache-busting for fresh PDF download');

        // For PDF generation, we need member data
        if (!member) {
            return res.status(500).json({ 
                success: false, 
                error: 'Unable to retrieve educator session data' 
            });
        }

        // PERFORMANCE OPTIMIZATION: Parallel execution of data fetching
        console.time('⚡ Parallel data fetching');
        
        const [educatorLmids, pdfBuffer, memberData] = await Promise.all([
            // Database query for LMIDs
            findLmidsByMemberId(member.id),
            
            // PDF download with cache busting
            fetch(`${templatePdfUrl}?v=${Date.now()}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            }).then(async (pdfResponse) => {
                if (!pdfResponse.ok) {
                    throw new Error(`Failed to download Template PDF: ${pdfResponse.statusText}`);
                }
                return pdfResponse.arrayBuffer();
            }),
            
            // Memberstack API call for teacher data
            (async () => {
                const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
                if (!MEMBERSTACK_SECRET_KEY) {
                    console.warn(`⚠️ Memberstack secret key not configured`);
                    return null;
                }
                
                try {
                    const response = await fetch(`https://admin.memberstack.com/members/${member.id}`, {
                        method: 'GET',
                        headers: {
                            'x-api-key': MEMBERSTACK_SECRET_KEY,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        return data.data || data;
                    } else {
                        console.warn(`⚠️ Memberstack API error: ${response.status} ${response.statusText}`);
                        return null;
                    }
                } catch (error) {
                    console.warn('⚠️ Error fetching teacher data from Memberstack:', error.message);
                    return null;
                }
            })()
        ]);
        
        console.timeEnd('⚡ Parallel data fetching');

        // Process results
        if (!educatorLmids || educatorLmids.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'No LMIDs found for this educator' 
            });
        }

        // Get ShareID for the first LMID and specified world
        const primaryLmid = educatorLmids[0];
        const worldColumn = getWorldColumn(worldToUse);
        const shareId = primaryLmid[worldColumn];

        if (!shareId) {
            return res.status(404).json({ 
                success: false, 
                error: `No ShareID found for world: ${worldToUse}` 
            });
        }

        console.log('🎯 Found ShareID:', shareId, 'for LMID:', primaryLmid.lmid, 'world:', worldToUse);
        
        // Process teacher data
        let teacherName = 'Teacher';
        if (memberData) {
            // Extract first name from various possible fields (same as get-teacher-data.js)
            const firstName = 
                memberData.customFields?.['first-name'] || // Correct field name with hyphen
                memberData.customFields?.['First Name'] ||  // Alternative with space  
                memberData.customFields?.firstName ||
                memberData.customFields?.['first_name'] ||
                memberData.metaData?.firstName ||
                memberData.metaData?.['first-name'] ||
                '';
            
            const lastName = 
                memberData.customFields?.['last-name'] ||   // Correct field name with hyphen
                memberData.customFields?.['Last Name'] ||   // Alternative with space
                memberData.customFields?.lastName ||
                memberData.customFields?.['last_name'] ||
                memberData.metaData?.lastName ||
                memberData.metaData?.['last-name'] ||
                '';
            
            console.log(`✅ Teacher data from Memberstack: "${firstName} ${lastName}"`);
            
            // Combine names (same logic as get-teacher-data.js)
            const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
            teacherName = fullName || 'Teacher';
        }

        // Generate ShareID URL - detect domain from referer header
        const referer = req.headers.referer || req.headers.referrer || '';
        let baseDomain = 'https://heyfeelings.com'; // Default to production
        
        if (referer) {
            try {
                const refererUrl = new URL(referer);
                baseDomain = `${refererUrl.protocol}//${refererUrl.hostname}`;
            } catch (error) {
                console.warn('⚠️ Could not parse referer URL, using default domain');
            }
        }
        
        const shareUrl = `${baseDomain}/little-microphones?ID=${shareId}`;
        console.log('🔗 Generated QR URL:', shareUrl);

        // PERFORMANCE OPTIMIZATION: Parallel PDF processing and QR generation
        console.time('⚡ Parallel PDF + QR processing');
        
        const [pdfDoc, qrPngBuffer] = await Promise.all([
            // PDF document loading
            PDFDocument.load(pdfBuffer),
            
            // QR code generation (no margin/padding around QR)
            QRCode.toBuffer(shareUrl, {
                type: 'png',
                width: 400,
                margin: 0,
                color: {
                    dark: '#000000FF',
                    light: '#FFFFFFFF'
                }
            })
        ]);
        
        console.timeEnd('⚡ Parallel PDF + QR processing');

        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        // Look for QR placeholder in PDF and replace it with QR code
        const placeholderName = 'QR_PLACEHOLDER_1';
        // Looking for QR placeholder in PDF
        
        const qrPlaceholderFound = await findAndReplaceQrPlaceholder(pdfDoc, qrPngBuffer, placeholderName, shareUrl, teacherName, detectedLang);
        
        if (!qrPlaceholderFound) {
            // Fallback: place QR in bottom-right corner if placeholder not found
            const qrSize = 120;
            const margin = 32;
            const qrX = width - qrSize - margin;
            const qrY = margin;
            
            // Embed font and draw elements at fallback positions
            const qrImage = await pdfDoc.embedPng(qrPngBuffer);
            const font = await pdfDoc.embedFont('Helvetica');
            
            // Use same positions as main function - based on Figma A4 measurements
            const PDF_POSITIONS = {
                QR_CODE: { x: 100, y: 178, size: 120 },        // 178px from bottom in Figma
                URL_TEXT: { x: 100, y: 162, fontSize: 8 },     // 162px from bottom in Figma  
                TEACHER_INFO: { x: 100, y: 120, fontSize: 10 } // 120px from bottom in Figma
            };
            
            // Draw QR code at configured position
            firstPage.drawImage(qrImage, {
                x: PDF_POSITIONS.QR_CODE.x,
                y: PDF_POSITIONS.QR_CODE.y,
                width: PDF_POSITIONS.QR_CODE.size,
                height: PDF_POSITIONS.QR_CODE.size,
            });
            
            // Draw URL text at configured position
            firstPage.drawText(shareUrl, {
                x: PDF_POSITIONS.URL_TEXT.x,
                y: PDF_POSITIONS.URL_TEXT.y,
                size: PDF_POSITIONS.URL_TEXT.fontSize,
                font: font,
                color: rgb(0/255, 122/255, 247/255),
            });
            
            // Draw teacher name at configured position
            firstPage.drawText(teacherName, {
                x: PDF_POSITIONS.TEACHER_INFO.x,
                y: PDF_POSITIONS.TEACHER_INFO.y,
                size: PDF_POSITIONS.TEACHER_INFO.fontSize,
                font: font,
                color: rgb(0, 0, 0),
            });
            
            // Draw language-appropriate teacher label below name
            const teacherLabel = detectedLang === 'pl' ? 'Wasz Nauczyciel' : 'Your Teacher';
            firstPage.drawText(teacherLabel, {
                x: PDF_POSITIONS.TEACHER_INFO.x,
                y: PDF_POSITIONS.TEACHER_INFO.y - PDF_POSITIONS.TEACHER_INFO.fontSize - 2,
                size: PDF_POSITIONS.TEACHER_INFO.fontSize - 1,
                font: font,
                color: rgb(128/255, 128/255, 128/255),
            });
            
            console.log('✅ Elements placed at configured positions');
            console.log(`📱 QR code placed at (${PDF_POSITIONS.QR_CODE.x}, ${PDF_POSITIONS.QR_CODE.y})`);
            console.log(`📝 URL text placed at (${PDF_POSITIONS.URL_TEXT.x}, ${PDF_POSITIONS.URL_TEXT.y})`);
            console.log(`👨‍🏫 Teacher info placed at (${PDF_POSITIONS.TEACHER_INFO.x}, ${PDF_POSITIONS.TEACHER_INFO.y}): ${teacherName}`);
        }
        console.log('📋 PDF generation completed successfully');

        // Generate modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        
        console.timeEnd('🚀 Total PDF generation time');

        // Set response headers for PDF display in browser (not download)
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${item}-with-qr.pdf"`);
        res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600'); // 24h cache
        res.setHeader('Content-Length', modifiedPdfBytes.length);

        // Return PDF
        return res.status(200).send(Buffer.from(modifiedPdfBytes));

    } catch (error) {
        console.error('❌ PDF generation error:', error);
        
        // Try to return base PDF as fallback
        if (error.templatePdfUrl) {
            console.log('🔄 Falling back to Template PDF');
            return res.redirect(302, error.templatePdfUrl);
        }

        return res.status(500).json({ 
            success: false, 
            error: 'Failed to generate PDF with QR code',
            details: error.message
        });
    }
}

// Removed: getBasePdfFromWebflow() - now handled by utils/webflow-api.js

/**
 * Find and replace placeholders in PDF with QR code, URL text, and teacher info
 * Searches for form fields: QR_PLACEHOLDER_1, TEACHER_PLACEHOLDER, URL_PLACEHOLDER
 * @param {PDFDocument} pdfDoc - PDF document
 * @param {Buffer} qrPngBuffer - QR code PNG buffer
 * @param {string} placeholderName - Legacy parameter (kept for compatibility)
 * @param {string} shareUrl - URL to display under QR code
 * @param {string} teacherName - Teacher's full name
 * @param {string} detectedLang - Language code ('en' or 'pl')
 * @returns {Promise<boolean>} True if any placeholder was found, false if all fallback
 */
async function findAndReplaceQrPlaceholder(pdfDoc, qrPngBuffer, placeholderName, shareUrl, teacherName, detectedLang) {
    try {
        const qrImage = await pdfDoc.embedPng(qrPngBuffer);
        const pages = pdfDoc.getPages();
        
        // Embed font for URL text
        const font = await pdfDoc.embedFont('Helvetica');
        
        // PDF element positions based on Figma A4 artboard (595x842px) measurements
        const PDF_POSITIONS = {
            // Teacher info: 120px from bottom in Figma
            TEACHER_INFO: { x: 100, y: 120, fontSize: 10 },
            
            // URL text: 162px from bottom in Figma
            URL_TEXT: { x: 100, y: 162, fontSize: 8 },
            
            // QR code: 178px from bottom in Figma
            QR_CODE: { x: 100, y: 178, size: 120 }
        };
        
        // Track found placeholder positions
        let foundPositions = {
            qr: null,
            teacher: null,
            url: null
        };
        
        // Function to search for all placeholders
        const searchForPlaceholders = async () => {
            console.log('🔍 Searching for placeholders: QR_PLACEHOLDER_1, TEACHER_PLACEHOLDER, URL_PLACEHOLDER');
            
            // Also try to remove any existing QR codes/images that might conflict
            console.log('🗑️ Attempting to clean existing QR codes from PDF...');
            
            for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                const page = pages[pageIndex];
                console.log(`📄 Searching page ${pageIndex + 1}...`);
                
                // Search for form fields
                try {
                    const form = pdfDoc.getForm();
                    const fields = form.getFields();
                    
                    for (const field of fields) {
                        const fieldName = field.getName();
                        
                        if (fieldName === 'QR_PLACEHOLDER_1' && !foundPositions.qr) {
                            const widgets = field.acroField.getWidgets();
                            if (widgets.length > 0) {
                                const rect = widgets[0].getRectangle();
                                foundPositions.qr = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                                console.log(`✅ Found QR_PLACEHOLDER_1 at:`, foundPositions.qr);
                                form.removeField(field);
                            }
                        }
                        
                        if (fieldName === 'TEACHER_PLACEHOLDER' && !foundPositions.teacher) {
                            const widgets = field.acroField.getWidgets();
                            if (widgets.length > 0) {
                                const rect = widgets[0].getRectangle();
                                foundPositions.teacher = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                                console.log(`✅ Found TEACHER_PLACEHOLDER at:`, foundPositions.teacher);
                                form.removeField(field);
                            }
                        }
                        
                        if (fieldName === 'URL_PLACEHOLDER' && !foundPositions.url) {
                            const widgets = field.acroField.getWidgets();
                            if (widgets.length > 0) {
                                const rect = widgets[0].getRectangle();
                                foundPositions.url = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                                console.log(`✅ Found URL_PLACEHOLDER at:`, foundPositions.url);
                                form.removeField(field);
                            }
                        }
                    }
                } catch (formError) {
                    console.log('ℹ️ No form fields found on page', pageIndex + 1);
                }
                
                // If all placeholders found, break early
                if (foundPositions.qr && foundPositions.teacher && foundPositions.url) {
                    console.log('🎯 All placeholders found!');
                    break;
                }
            }
        };
        
        // Search for placeholders first
        await searchForPlaceholders();
        
        // Helper function to draw QR code only
        const drawQrCode = (page, x, y, width, height) => {
            page.drawImage(qrImage, {
                x: x,
                y: y,
                width: width,
                height: height,
            });
            console.log(`📱 QR code placed at (${x}, ${y}) size: ${width}x${height}`);
        };
        
        // Helper function to draw URL text at specific coordinates
        const drawUrlText = (page, x, y, fontSize = 8) => {
            page.drawText(shareUrl, {
                x: x,
                y: y,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
            });
            console.log(`📝 URL text placed at (${x}, ${y}): "${shareUrl}"`);
        };
        
        // Helper function to draw teacher info at specific coordinates
        const drawTeacherInfo = (page, x, y, fontSize = 10) => {
            console.log(`🎯 Drawing teacher info: "${teacherName}" at position (${x}, ${y})`);
            
            // Draw teacher name
            page.drawText(teacherName, {
                x: x,
                y: y,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
            });
            
            // Draw language-appropriate teacher label below name
            const teacherLabel = detectedLang === 'pl' ? 'Wasz Nauczyciel' : 'Your Teacher';
            page.drawText(teacherLabel, {
                x: x,
                y: y - fontSize - 2,
                size: fontSize - 1,
                font: font,
                color: rgb(0.3, 0.3, 0.3), // Gray color
            });
            
            console.log(`✅ Teacher info placed successfully: "${teacherName}" (${teacherLabel}) at (${x}, ${y})`);
        };
        
        // Check if any placeholders were found
        const foundAnyPlaceholder = !!(foundPositions.qr || foundPositions.teacher || foundPositions.url);
        
        if (foundAnyPlaceholder) {
            // Draw elements using found placeholder positions
            const firstPage = pages[0];
            
            console.log('📍 Using PLACEHOLDER positions:');
            if (foundPositions.qr) console.log(`   QR: PLACEHOLDER at (${foundPositions.qr.x}, ${foundPositions.qr.y})`);
            if (foundPositions.teacher) console.log(`   Teacher: PLACEHOLDER at (${foundPositions.teacher.x}, ${foundPositions.teacher.y})`);
            if (foundPositions.url) console.log(`   URL: PLACEHOLDER at (${foundPositions.url.x}, ${foundPositions.url.y})`);
            
            // Draw QR code
            const qrSize = foundPositions.qr ? Math.min(foundPositions.qr.width, foundPositions.qr.height) : PDF_POSITIONS.QR_CODE.size;
            const qrX = foundPositions.qr ? foundPositions.qr.x : PDF_POSITIONS.QR_CODE.x;
            const qrY = foundPositions.qr ? foundPositions.qr.y : PDF_POSITIONS.QR_CODE.y;
            drawQrCode(firstPage, qrX, qrY, qrSize, qrSize);
            
            // Draw URL text
            const urlX = foundPositions.url ? foundPositions.url.x : PDF_POSITIONS.URL_TEXT.x;
            const urlY = foundPositions.url ? foundPositions.url.y : PDF_POSITIONS.URL_TEXT.y;
            drawUrlText(firstPage, urlX, urlY, 8);
            
            // Draw teacher info
            const teacherX = foundPositions.teacher ? foundPositions.teacher.x : PDF_POSITIONS.TEACHER_INFO.x;
            const teacherY = foundPositions.teacher ? foundPositions.teacher.y : PDF_POSITIONS.TEACHER_INFO.y;
            drawTeacherInfo(firstPage, teacherX, teacherY, 10);
            
            console.log('✅ Elements placed using PLACEHOLDERS!');
            return true;
        } else {
            console.log('⚠️ No placeholders found - will use fallback positioning');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error in placeholder replacement:', error);
        return false;
    }
}
