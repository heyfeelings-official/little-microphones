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
        const { item, world, check } = req.query;

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

        // Decode world parameter (handles spaces like "Shopping Spree")
        const decodedWorld = decodeURIComponent(world).toLowerCase();
        console.log('📋 PDF Request:', { item, world: decodedWorld });

        // Validate world name (case insensitive)
        if (!WORLDS.includes(decodedWorld)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid world. Must be one of: ${WORLDS.join(', ')}. Received: ${decodedWorld}` 
            });
        }

        // Get workbook item from Webflow CMS
        const webflowItem = await getWebflowItem(item);
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
 * @param {PDFDocument} pdfDoc - PDF document
 * @param {Buffer} qrPngBuffer - QR code PNG buffer
 * @param {string} placeholderName - Name of placeholder to find (e.g., 'QR_PLACEHOLDER_1')
 * @returns {Promise<boolean>} True if placeholder was found and replaced
 */
async function findAndReplaceQrPlaceholder(pdfDoc, qrPngBuffer, placeholderName) {
    try {
        const qrImage = await pdfDoc.embedPng(qrPngBuffer);
        const pages = pdfDoc.getPages();
        
        console.log(`📋 Searching ${pages.length} pages for placeholder: ${placeholderName}`);
        
        // Search through all pages
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            const page = pages[pageIndex];
            
            // Get page content - this is a simplified approach
            // In practice, finding text in PDF is complex, so we'll use form fields or annotations
            
            // Try to find form fields with the placeholder name
            const form = pdfDoc.getForm();
            const fields = form.getFields();
            
            console.log(`📄 Page ${pageIndex + 1}: Found ${fields.length} form fields`);
            
            // List all field names for debugging
            const fieldNames = fields.map(f => f.getName());
            console.log('🏷️ Available field names:', fieldNames);
            
            for (const field of fields) {
                if (field.getName() === placeholderName) {
                    console.log(`🎯 Found placeholder field: ${placeholderName}`);
                    
                    // Get field position and size
                    const widgets = field.acroField.getWidgets();
                    if (widgets.length > 0) {
                        const widget = widgets[0];
                        const rect = widget.getRectangle();
                        
                        const x = rect.x;
                        const y = rect.y; 
                        const width = rect.width;
                        const height = rect.height;
                        
                        // Draw QR code at placeholder position
                        page.drawImage(qrImage, {
                            x: x,
                            y: y,
                            width: width,
                            height: height,
                        });
                        
                        // Remove the placeholder field
                        form.removeField(field);
                        
                        console.log(`✅ QR code placed at placeholder ${placeholderName}:`, { x, y, width, height });
                        return true;
                    }
                }
            }
            
            // Alternative: Look for text annotations or other markers
            // This is a fallback if form fields don't work
            try {
                const annotations = page.node.Annots;
                if (annotations) {
                    // Search through annotations for placeholder
                    // This is more complex and would require additional PDF parsing
                }
            } catch (annotationError) {
                // Annotations might not exist or be accessible
            }
        }
        
        console.log(`⚠️ Placeholder ${placeholderName} not found in PDF`);
        return false;
        
    } catch (error) {
        console.error(`❌ Error finding/replacing placeholder ${placeholderName}:`, error);
        return false;
    }
}
