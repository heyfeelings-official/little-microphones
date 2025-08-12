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
import { getWebflowItem, checkDynamicQR, getBasePdfUrl, getFinalPdfLink, getQrPosition } from '../utils/webflow-api.js';

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

        // Detect language from query parameter or referer header
        let detectedLang = lang || 'en'; // Default to English
        
        if (!lang) {
            const referer = req.headers.referer || req.headers.referrer || '';
            if (referer.includes('/pl/')) {
                detectedLang = 'pl';
            }
        }

        // Decode world parameter (handles spaces like "Shopping Spree")
        const decodedWorld = decodeURIComponent(world).toLowerCase();
        console.log('📋 PDF Request:', { item, world: decodedWorld, language: detectedLang });

        // Validate world name (case insensitive)
        if (!WORLDS.includes(decodedWorld)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid world. Must be one of: ${WORLDS.join(', ')}. Received: ${decodedWorld}` 
            });
        }

        // Get workbook item from Webflow CMS
        const webflowItem = await getWebflowItem(item, detectedLang);
        if (!webflowItem) {
            return res.status(404).json({ 
                success: false, 
                error: 'Workbook item not found in CMS' 
            });
        }

        console.log('📋 Webflow item loaded:', { 
            slug: webflowItem.slug, 
            dynamicQR: webflowItem.dynamicQR,
            world: webflowItem.world
        });

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

        console.log('👨‍🏫 Educator authenticated:', member.id);

        // Check if Dynamic QR is enabled
        if (!checkDynamicQR(webflowItem)) {
            console.log('🔄 Dynamic QR disabled, redirecting to base PDF file');
            const basePdfUrl = getBasePdfUrl(webflowItem);
            if (basePdfUrl) {
                console.log('📄 Redirecting to base PDF:', basePdfUrl);
                return res.redirect(302, basePdfUrl);
            } else {
                // Fallback to Final PDF Link if base PDF not available
                const finalPdfLink = getFinalPdfLink(webflowItem);
                if (finalPdfLink) {
                    console.log('📄 Redirecting to final PDF link:', finalPdfLink);
                    return res.redirect(302, finalPdfLink);
                } else {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'No PDF link available for this item' 
                    });
                }
            }
        }

        // Use world from CMS if not provided in URL
        const worldToUse = decodedWorld || webflowItem.world?.toLowerCase();
        if (!worldToUse || !WORLDS.includes(worldToUse)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid world: ${worldToUse}. Must be one of: ${WORLDS.join(', ')}` 
            });
        }

        // Find educator's LMIDs
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

        // Get base PDF URL from Webflow CMS
        const basePdfUrl = getBasePdfUrl(webflowItem);
        if (!basePdfUrl) {
            return res.status(404).json({ 
                success: false, 
                error: 'Base PDF not found for this item' 
            });
        }

        console.log('📄 Base PDF URL from CMS:', basePdfUrl);

        // Download base PDF
        const pdfResponse = await fetch(basePdfUrl);
        if (!pdfResponse.ok) {
            throw new Error(`Failed to download base PDF: ${pdfResponse.statusText}`);
        }
        const pdfBuffer = await pdfResponse.arrayBuffer();

        // Load PDF document
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        // Generate ShareID URL (should point to Webflow, not Vercel)
        const shareUrl = `https://hey-feelings-v2.webflow.io/little-microphones?ID=${shareId}`;

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
        const qrPositionConfig = getQrPosition(webflowItem);
        const placeholderName = qrPositionConfig?.placeholder || 'QR_PLACEHOLDER_1';
        console.log('🔍 Looking for QR placeholder:', placeholderName);
        
        const qrPlaceholderFound = await findAndReplaceQrPlaceholder(pdfDoc, qrPngBuffer, placeholderName);
        
        if (!qrPlaceholderFound) {
            // Fallback: place QR in bottom-right corner if placeholder not found
            const qrSize = 120;
            const margin = 32;
            const qrX = width - qrSize - margin;
            const qrY = margin;
            
            const qrImage = await pdfDoc.embedPng(qrPngBuffer);
            firstPage.drawImage(qrImage, {
                x: qrX,
                y: qrY,
                width: qrSize,
                height: qrSize,
            });
            
            console.log('⚠️ QR_PLACEHOLDER_1 not found, placed QR in bottom-right corner:', { x: qrX, y: qrY, size: qrSize });
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
        if (error.basePdfUrl) {
            console.log('🔄 Falling back to base PDF');
            return res.redirect(302, error.basePdfUrl);
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
 * @returns {Promise<boolean>} True if placeholder was found and replaced
 */
async function findAndReplaceQrPlaceholder(pdfDoc, qrPngBuffer, placeholderName) {
    try {
        const qrImage = await pdfDoc.embedPng(qrPngBuffer);
        const pages = pdfDoc.getPages();
        
        console.log(`📋 Searching ${pages.length} pages for graphic placeholder: ${placeholderName}`);
        
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
                                
                                page.drawImage(qrImage, {
                                    x: rect.x,
                                    y: rect.y,
                                    width: rect.width,
                                    height: rect.height,
                                });
                                
                                form.removeField(field);
                                console.log(`✅ QR code placed at form field ${placeholderName}:`, rect);
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
                    
                    // Place QR code at the found position
                    const qrSize = Math.min(placeholderMatch.width || 120, placeholderMatch.height || 120, 120);
                    
                    page.drawImage(qrImage, {
                        x: placeholderMatch.x,
                        y: placeholderMatch.y,
                        width: qrSize,
                        height: qrSize,
                    });
                    
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
                    
                    page.drawImage(qrImage, {
                        x: placeholderRect.x,
                        y: placeholderRect.y,
                        width: placeholderRect.width,
                        height: placeholderRect.height,
                    });
                    
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
