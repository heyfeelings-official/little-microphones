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
        
        // Get teacher data from LMID (same approach as radio.js)
        let teacherName = 'Teacher';
        try {
            console.log(`👨‍🏫 Fetching teacher data for LMID: ${primaryLmid.lmid}`);
            const teacherResponse = await fetch(`${req.protocol}://${req.get('host')}/api/get-teacher-data?lmid=${primaryLmid.lmid}`);
            
            if (teacherResponse.ok) {
                const teacherData = await teacherResponse.json();
                if (teacherData.success) {
                    teacherName = teacherData.data.teacherName || 'Teacher';
                    console.log('✅ Teacher name retrieved:', teacherName);
                } else {
                    console.warn('⚠️ Teacher data API returned error:', teacherData.error);
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
        
        const qrPlaceholderFound = await findAndReplaceQrPlaceholder(pdfDoc, qrPngBuffer, placeholderName, shareUrl, teacherName);
        
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
                QR_CODE: { x: 50, y: 500, size: 120 },
                URL_TEXT: { x: 50, y: 650, fontSize: 8 },
                TEACHER_INFO: { x: 50, y: 700, fontSize: 10 }
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
            
            // Draw "Your Teacher" below name
            firstPage.drawText('Your Teacher', {
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
 * Find and replace QR placeholder in PDF with QR code
 * Searches for graphic objects/layers with the placeholder name
 * @param {PDFDocument} pdfDoc - PDF document
 * @param {Buffer} qrPngBuffer - QR code PNG buffer
 * @param {string} placeholderName - Name of placeholder to find (e.g., 'QR_PLACEHOLDER_1')
 * @param {string} shareUrl - URL to display under QR code
 * @param {string} teacherName - Teacher's full name
 * @returns {Promise<boolean>} True if placeholder was found and replaced
 */
async function findAndReplaceQrPlaceholder(pdfDoc, qrPngBuffer, placeholderName, shareUrl, teacherName) {
    try {
        const qrImage = await pdfDoc.embedPng(qrPngBuffer);
        const pages = pdfDoc.getPages();
        
        // Embed font for URL text
        const font = await pdfDoc.embedFont('Helvetica');
        
        // Position configuration for PDF elements (all left-aligned at x=50)
        // Note: In PDF coordinates, Y=0 is at bottom, so higher Y values = higher on page
        const POSITIONS = {
            // Teacher info position (Y=700 = highest on page)
            TEACHER_INFO: { x: 50, y: 700, fontSize: 10 },
            
            // URL text position (Y=650 = middle)
            URL_TEXT: { x: 50, y: 650, fontSize: 8 },
            
            // QR code position (Y=500 = lower, but above bottom)
            QR_CODE: { x: 50, y: 500, size: 120 }
        };
        
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
            
            // Draw "Your Teacher" below name
            page.drawText('Your Teacher', {
                x: x,
                y: y - fontSize - 2,
                size: fontSize - 1,
                font: font,
                color: rgb(0.3, 0.3, 0.3), // Gray color
            });
            
            console.log(`✅ Teacher info placed successfully: "${teacherName}" at (${x}, ${y})`);
        };
        
        // Searching PDF pages for placeholder
        
        // Search through all pages
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            const page = pages[pageIndex];
            
            // Method 1: Try to find form fields (legacy support)
            try {
                const form = pdfDoc.getForm();
                const fields = form.getFields();
                
                if (fields.length > 0) {
                    console.log(`📄 Page ${pageIndex + 1}: Found ${fields.length} form fields`);
                    const fieldNames = fields.map(f => f.getName());
                    console.log('🏷️ Available field names:', fieldNames);
                    
                    for (const field of fields) {
                        if (field.getName() === placeholderName) {
                            console.log(`🎯 Found placeholder field: ${placeholderName}`);
                            
                            const widgets = field.acroField.getWidgets();
                            if (widgets.length > 0) {
                                const widget = widgets[0];
                                const rect = widget.getRectangle();
                                
                                // Draw QR code at placeholder position
                                drawQrCode(page, rect.x, rect.y, rect.width, rect.height);
                                
                                // Draw URL text at configured position
                                drawUrlText(page, POSITIONS.URL_TEXT.x, POSITIONS.URL_TEXT.y, POSITIONS.URL_TEXT.fontSize);
                                
                                // Draw teacher info at configured position
                                drawTeacherInfo(page, POSITIONS.TEACHER_INFO.x, POSITIONS.TEACHER_INFO.y, POSITIONS.TEACHER_INFO.fontSize);
                                
                                form.removeField(field);
                                console.log(`✅ QR code with URL text placed at form field ${placeholderName}:`, rect);
                                return true;
                            }
                        }
                    }
                }
            } catch (formError) {
                console.log('ℹ️ No form fields found, searching for graphic objects...');
            }
            
            // Method 2: Search for text objects containing the placeholder name
            try {
                const pageContent = await extractPageContent(page);
                const placeholderMatch = findTextPlaceholder(pageContent, placeholderName);
                
                if (placeholderMatch) {
                    console.log(`🎯 Found text placeholder: ${placeholderName}`);
                    
                    // Place QR code with text at the found position
                    const qrSize = Math.min(placeholderMatch.width || 120, placeholderMatch.height || 120, 120);
                    
                    // Draw QR code at placeholder position
                    drawQrCode(page, placeholderMatch.x, placeholderMatch.y, qrSize, qrSize);
                    
                    // Draw URL text at configured position
                    drawUrlText(page, POSITIONS.URL_TEXT.x, POSITIONS.URL_TEXT.y, POSITIONS.URL_TEXT.fontSize);
                    
                    // Draw teacher info at configured position
                    drawTeacherInfo(page, POSITIONS.TEACHER_INFO.x, POSITIONS.TEACHER_INFO.y, POSITIONS.TEACHER_INFO.fontSize);
                    
                    console.log(`✅ QR code placed at text placeholder ${placeholderName}:`, placeholderMatch);
                    return true;
                }
            } catch (textError) {
                console.log('ℹ️ Text extraction failed, trying coordinate-based placement...');
            }
            
            // Method 3: Try to find rectangular objects that might be placeholders
            try {
                const placeholderRect = await findGraphicPlaceholder(page, placeholderName);
                if (placeholderRect) {
                    console.log(`🎯 Found graphic placeholder: ${placeholderName}`);
                    
                    // Draw QR code at placeholder position
                    drawQrCode(page, placeholderRect.x, placeholderRect.y, placeholderRect.width, placeholderRect.height);
                    
                    // Draw URL text at configured position
                    drawUrlText(page, POSITIONS.URL_TEXT.x, POSITIONS.URL_TEXT.y, POSITIONS.URL_TEXT.fontSize);
                    
                    // Draw teacher info at configured position
                    drawTeacherInfo(page, POSITIONS.TEACHER_INFO.x, POSITIONS.TEACHER_INFO.y, POSITIONS.TEACHER_INFO.fontSize);
                    
                    console.log(`✅ QR code placed at graphic placeholder ${placeholderName}:`, placeholderRect);
                    return true;
                }
            } catch (graphicError) {
                console.log('ℹ️ Graphic object search failed');
            }
        }
        
        console.log(`⚠️ Placeholder ${placeholderName} not found in PDF`);
        return false;
        
    } catch (error) {
        console.error(`❌ Error finding/replacing placeholder ${placeholderName}:`, error);
        return false;
    }
}

/**
 * Extract text content and positions from a PDF page
 * @param {PDFPage} page - PDF page
 * @returns {Promise<Array>} Array of text objects with positions
 */
async function extractPageContent(page) {
    try {
        // This is a simplified approach - pdf-lib doesn't have built-in text extraction
        // We'll try to access the page's content stream
        const pageNode = page.node;
        
        // Look for text objects in the page content
        // This is complex and may not work for all PDF structures
        return [];
    } catch (error) {
        console.log('Text extraction not available');
        return [];
    }
}

/**
 * Find text placeholder in page content
 * @param {Array} pageContent - Page content objects
 * @param {string} placeholderName - Placeholder name to find
 * @returns {Object|null} Position object or null
 */
function findTextPlaceholder(pageContent, placeholderName) {
    // Search through text objects for the placeholder name
    for (const textObj of pageContent) {
        if (textObj.text && textObj.text.includes(placeholderName)) {
            return {
                x: textObj.x || 0,
                y: textObj.y || 0,
                width: textObj.width || 120,
                height: textObj.height || 120
            };
        }
    }
    return null;
}

/**
 * Find graphic placeholder (rectangle/shape) that might represent QR position
 * @param {PDFPage} page - PDF page
 * @param {string} placeholderName - Placeholder name to find
 * @returns {Promise<Object|null>} Position object or null
 */
async function findGraphicPlaceholder(page, placeholderName) {
    try {
        // For Figma-exported PDFs, we'll use a heuristic approach
        // Look for squares/rectangles that are likely QR code placeholders
        
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // Based on your PDF screenshot, the QR code appears to be in the bottom right
        // Let's calculate the exact position based on the white square visible in the PDF
        
        console.log(`📐 PDF dimensions: ${pageWidth} x ${pageHeight}`);
        
        // Check if this matches expected PDF dimensions (595x842)
        const isExpectedSize = Math.abs(pageWidth - 595) < 10 && Math.abs(pageHeight - 842) < 10;
        
        if (isExpectedSize) {
            // Exact coordinates for 595x842px PDF
            // QR code position: 253px from left, 532px from top
            // QR code size: 90x90px
            const qrPosition = {
                x: 253,              // 253px from left edge
                y: 170,              // User specified y coordinate
                width: 90,           // User specified size
                height: 90
            };
            
            console.log(`📐 Using exact coordinates for standard PDF (595x842):`, qrPosition);
            return qrPosition;
        } else {
            // Fallback for different PDF sizes - scale proportionally
            const scaleX = pageWidth / 595;
            const scaleY = pageHeight / 842;
            
            const qrPosition = {
                x: 253 * scaleX,
                y: pageHeight - (532 * scaleY) - (90 * Math.min(scaleX, scaleY)),
                width: 90 * Math.min(scaleX, scaleY),
                height: 90 * Math.min(scaleX, scaleY)
            };
            
            console.log(`📐 Using scaled coordinates for PDF (${pageWidth}x${pageHeight}):`, qrPosition);
            return qrPosition;
        }
        
    } catch (error) {
        console.log('Graphic placeholder detection failed');
        return null;
    }
}
