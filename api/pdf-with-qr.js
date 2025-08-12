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
import { getMemberDetails } from '../utils/memberstack-utils.js';
import { findLmidsByMemberId } from '../utils/database-utils.js';

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
        const { item, world } = req.query;

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

        // Get educator from query parameter (for testing) or implement proper session handling
        const { memberId } = req.query;
        
        // For testing - in production this would come from session/cookies
        if (!memberId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: memberId (for testing). In production this would come from session.' 
            });
        }

        // Get member details from Memberstack
        const member = await getMemberDetails(memberId);
        if (!member) {
            return res.status(404).json({ 
                success: false, 
                error: 'Member not found or invalid memberId.' 
            });
        }

        console.log('👨‍🏫 Educator authenticated:', member.id);

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
        const worldColumn = getWorldColumn(decodedWorld);
        const shareId = primaryLmid[worldColumn];

        if (!shareId) {
            return res.status(404).json({ 
                success: false, 
                error: `No ShareID found for world: ${decodedWorld}` 
            });
        }

        console.log('🎯 Found ShareID:', shareId, 'for LMID:', primaryLmid.lmid, 'world:', decodedWorld);

        // Get base PDF URL from Webflow CMS
        const basePdfUrl = await getBasePdfFromWebflow(item);
        if (!basePdfUrl) {
            return res.status(404).json({ 
                success: false, 
                error: 'Base PDF not found for this item' 
            });
        }

        console.log('📄 Base PDF URL:', basePdfUrl);

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

        // Embed QR code PNG in PDF
        const qrSize = 120; // Size in points (about 4.2cm at 72 DPI)
        const margin = 32; // Margin from edges
        
        // Position: bottom-right corner
        const qrX = width - qrSize - margin;
        const qrY = margin;

        // Embed PNG (pdf-lib supports PNG)
        const qrImage = await pdfDoc.embedPng(qrPngBuffer);
        
        // Draw QR code on first page
        firstPage.drawImage(qrImage, {
            x: qrX,
            y: qrY,
            width: qrSize,
            height: qrSize,
        });

        console.log('✅ QR code embedded at position:', { x: qrX, y: qrY, size: qrSize });
        console.log('📋 PDF generation completed successfully');

        // Generate modified PDF
        const modifiedPdfBytes = await pdfDoc.save();

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${item}-with-qr.pdf"`);
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

/**
 * Get base PDF URL from Webflow CMS for a given item
 * @param {string} itemSlug - Webflow CMS item slug
 * @returns {Promise<string|null>} Base PDF URL or null
 */
async function getBasePdfFromWebflow(itemSlug) {
    try {
        // Mock implementation for testing - replace with real Webflow API integration
        console.log('🔍 Looking up base PDF for item:', itemSlug);
        
        // Map item slugs to real PDF URLs from Webflow CMS
        // Using real Spookyland PDF for testing
        const pdfUrls = {
            'lesson-4-math': 'https://cdn.prod.website-files.com/67ed2ca426df0fc1a0b57c79/689aff303d73c9664bbee584_lm-base-pdf.pdf',
            'lesson-4-art': 'https://cdn.prod.website-files.com/67ed2ca426df0fc1a0b57c79/689aff303d73c9664bbee584_lm-base-pdf.pdf',
            'lesson-5-history': 'https://cdn.prod.website-files.com/67ed2ca426df0fc1a0b57c79/689aff303d73c9664bbee584_lm-base-pdf.pdf',
            'workbook-emotions': 'https://cdn.prod.website-files.com/67ed2ca426df0fc1a0b57c79/689aff303d73c9664bbee584_lm-base-pdf.pdf',
            'default': 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        };
        
        const pdfUrl = pdfUrls[itemSlug] || pdfUrls['default'];
        console.log('📄 PDF URL:', pdfUrl);
        
        return pdfUrl;
        
        // TODO: Replace with real Webflow API integration:
        // const webflowApiUrl = `https://api.webflow.com/sites/${SITE_ID}/collections/${COLLECTION_ID}/items`;
        // const response = await fetch(webflowApiUrl, { headers: { 'Authorization': `Bearer ${WEBFLOW_TOKEN}` }});
        // const items = await response.json();
        // const item = items.items.find(i => i.slug === itemSlug);
        // return item?.['base-pdf']?.url;
        
    } catch (error) {
        console.error('❌ Error fetching base PDF from Webflow:', error);
        return null;
    }
}
