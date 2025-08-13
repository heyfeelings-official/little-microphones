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
import { getSupabaseClient, WORLDS, getWorldColumn } from '../utils/lmid-utils.js';
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

        // Validate world name
        if (!WORLDS.includes(normalizedWorld)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid world. Must be one of: ${WORLDS.join(', ')}. Received: ${rawWorld} (normalized: ${normalizedWorld})` 
            });
        }

        // Get workbook item from Webflow CMS
        const webflowItem = await getWebflowItem(item, detectedLang);
        if (!webflowItem) {
            // Don't log as error - this is normal for items not in CMS
            if (check === 'true') {
                // For check requests, this is expected - some buttons don't have CMS items
                console.log(`ℹ️ Item not in CMS (normal): ${item}`);
            } else {
                console.log(`⚠️ PDF generation attempted for non-existent item: ${item}`);
            }
            return res.status(404).json({ 
                success: false, 
                error: 'Workbook item not found in CMS' 
            });
        }

        // Webflow item loaded successfully

        // If this is just a check request, return Dynamic QR status
        if (check === 'true') {
            return res.status(200).json({
                success: true,
                needsDynamicQR: checkDynamicQR(webflowItem),
                item: webflowItem.slug,
                world: webflowItem.world
            });
        }

        // For actual PDF generation, require authentication
        const member = await getMemberFromSession(req);
        if (!member) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required. Please log in as an educator.' 
            });
        }

        console.log('👨‍🏫 Educator authenticated with member ID:', member.id);

        // Check if Dynamic QR is enabled
        if (!checkDynamicQR(webflowItem)) {
            console.log('🔄 Dynamic QR disabled, redirecting to base PDF file');
            const templatePdfUrl = getTemplatePdfUrl(webflowItem);
            if (templatePdfUrl) {
                console.log('📄 Redirecting to Template PDF:', templatePdfUrl);
                return res.redirect(302, templatePdfUrl);
            } else {
                // Fallback to Static PDF if Template PDF not available
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

        // Use normalized world or normalize world from CMS
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

        // Find educator's LMIDs using the member ID
        const educatorLmids = await findLmidsByMemberId(member.id);
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
        
        // Get teacher data from LMID using lmid-operations API (has correct Supabase data)
        let teacherName = 'Teacher';
        try {
            console.log(`👨‍🏫 Fetching teacher data for LMID: ${primaryLmid.lmid}`);
            const teacherResponse = await fetch(`${req.protocol}://${req.get('host')}/api/lmid-operations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'get',
                    lmid: primaryLmid.lmid
                })
            });
            
            if (teacherResponse.ok) {
                const teacherData = await teacherResponse.json();
                if (teacherData.success) {
                    teacherName = teacherData.data.teacherName || 'Teacher';
                    console.log('✅ Teacher name retrieved from Supabase:', teacherName);
                } else {
                    console.warn('⚠️ LMID operations API returned error:', teacherData.error);
                }
            } else {
                console.warn(`⚠️ Failed to fetch teacher data: ${teacherResponse.status}`);
            }
        } catch (error) {
            console.warn('⚠️ Error fetching teacher data:', error.message);
        }

        // Get Template PDF URL from Webflow CMS
        const templatePdfUrl = getTemplatePdfUrl(webflowItem);
        if (!templatePdfUrl) {
            return res.status(404).json({ 
                success: false, 
                error: 'Template PDF not found for this item' 
            });
        }

        console.log('📄 Template PDF URL from CMS:', templatePdfUrl);

        // Download Template PDF
        const pdfResponse = await fetch(templatePdfUrl);
        if (!pdfResponse.ok) {
            throw new Error(`Failed to download Template PDF: ${pdfResponse.statusText}`);
        }
        const pdfBuffer = await pdfResponse.arrayBuffer();

        // Load PDF document
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

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

        // Generate QR code as PNG buffer
        const qrPngBuffer = await QRCode.toBuffer(shareUrl, {
            type: 'png',
            width: 400,
            margin: 2,
            color: {
                dark: '#000000FF',
                light: '#FFFFFFFF'
            }
        });

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
            
            // Use same positions as when placeholder is found
            const FALLBACK_POSITIONS = {
                QR_CODE: { x: 90, y: 300, size: 120 },        // Duży czerwony prostokąt (dół)
                URL_TEXT: { x: 100, y: 50, fontSize: 8 },     // Najwyższy czerwony prostokąt (góra)
                TEACHER_INFO: { x: 100, y: 30, fontSize: 10 } // Średni czerwony prostokąt (środek)
            };
            
            // Draw QR code at left-aligned position instead of bottom-right
            firstPage.drawImage(qrImage, {
                x: FALLBACK_POSITIONS.QR_CODE.x,
                y: FALLBACK_POSITIONS.QR_CODE.y,
                width: FALLBACK_POSITIONS.QR_CODE.size,
                height: FALLBACK_POSITIONS.QR_CODE.size,
            });
            
            // Draw URL text at configured position
            firstPage.drawText(shareUrl, {
                x: FALLBACK_POSITIONS.URL_TEXT.x,
                y: FALLBACK_POSITIONS.URL_TEXT.y,
                size: FALLBACK_POSITIONS.URL_TEXT.fontSize,
                font: font,
                color: rgb(0, 0, 0),
            });
            
            // Draw teacher name at configured position
            firstPage.drawText(teacherName, {
                x: FALLBACK_POSITIONS.TEACHER_INFO.x,
                y: FALLBACK_POSITIONS.TEACHER_INFO.y,
                size: FALLBACK_POSITIONS.TEACHER_INFO.fontSize,
                font: font,
                color: rgb(0, 0, 0),
            });
            
            // Draw language-appropriate teacher label below name
            const teacherLabel = detectedLang === 'pl' ? 'Wasz Nauczyciel' : 'Your Teacher';
            firstPage.drawText(teacherLabel, {
                x: FALLBACK_POSITIONS.TEACHER_INFO.x,
                y: FALLBACK_POSITIONS.TEACHER_INFO.y - FALLBACK_POSITIONS.TEACHER_INFO.fontSize - 2,
                size: FALLBACK_POSITIONS.TEACHER_INFO.fontSize - 1,
                font: font,
                color: rgb(0.3, 0.3, 0.3),
            });
            
            console.log('⚠️ QR_PLACEHOLDER_1 not found, placed elements at left-aligned positions');
            console.log(`📱 QR code placed at (${FALLBACK_POSITIONS.QR_CODE.x}, ${FALLBACK_POSITIONS.QR_CODE.y})`);
            console.log(`📝 URL text placed at (${FALLBACK_POSITIONS.URL_TEXT.x}, ${FALLBACK_POSITIONS.URL_TEXT.y})`);
            console.log(`👨‍🏫 Teacher info placed at (${FALLBACK_POSITIONS.TEACHER_INFO.x}, ${FALLBACK_POSITIONS.TEACHER_INFO.y}): ${teacherName}`);
        }
        console.log('📋 PDF generation completed successfully');

        // Generate modified PDF
        const modifiedPdfBytes = await pdfDoc.save();

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
        
        // Default position configuration for PDF elements (fallback coordinates)
        const FALLBACK_POSITIONS = {
            // Teacher info position (środkowy czerwony prostokąt)
            TEACHER_INFO: { x: 100, y: 250, fontSize: 10 },
            
            // URL text position (najwyższy czerwony prostokąt)  
            URL_TEXT: { x: 100, y: 400, fontSize: 8 },
            
            // QR code position (duży czerwony prostokąt na dole)
            QR_CODE: { x: 100, y: 40, size: 120 }
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
        
        // Draw elements using found placeholders or fallback positions
        const firstPage = pages[0];
        
        // Determine positions for each element
        const qrPos = foundPositions.qr || FALLBACK_POSITIONS.QR_CODE;
        const teacherPos = foundPositions.teacher || FALLBACK_POSITIONS.TEACHER_INFO;
        const urlPos = foundPositions.url || FALLBACK_POSITIONS.URL_TEXT;
        
        console.log('📍 Using positions:');
        console.log(`   QR: ${foundPositions.qr ? 'PLACEHOLDER' : 'FALLBACK'} at (${qrPos.x}, ${qrPos.y})`);
        console.log(`   Teacher: ${foundPositions.teacher ? 'PLACEHOLDER' : 'FALLBACK'} at (${teacherPos.x}, ${teacherPos.y})`);
        console.log(`   URL: ${foundPositions.url ? 'PLACEHOLDER' : 'FALLBACK'} at (${urlPos.x}, ${urlPos.y})`);
        
        // Draw QR code
        const qrSize = foundPositions.qr ? Math.min(qrPos.width, qrPos.height) : FALLBACK_POSITIONS.QR_CODE.size;
        drawQrCode(firstPage, qrPos.x, qrPos.y, qrSize, qrSize);
        
        // Draw URL text  
        const urlFontSize = foundPositions.url ? 8 : FALLBACK_POSITIONS.URL_TEXT.fontSize;
        drawUrlText(firstPage, urlPos.x, urlPos.y, urlFontSize);
        
        // Draw teacher info
        const teacherFontSize = foundPositions.teacher ? 10 : FALLBACK_POSITIONS.TEACHER_INFO.fontSize;
        drawTeacherInfo(firstPage, teacherPos.x, teacherPos.y, teacherFontSize);
        
        console.log('✅ All PDF elements placed successfully!');
        
        // Return true if any placeholder was found
        return !!(foundPositions.qr || foundPositions.teacher || foundPositions.url);
        
    } catch (error) {
        console.error('❌ Error in placeholder replacement:', error);
        return false;
    }
}
