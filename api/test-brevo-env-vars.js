/**
 * api/test-brevo-env-vars.js - Test Brevo Environment Variables
 * 
 * PURPOSE: Test and display current Brevo template configuration
 * USAGE: GET /api/test-brevo-env-vars
 * 
 * This endpoint shows:
 * - Current template ID values from environment variables
 * - Which variables are set vs using fallback values
 * - Template mapping for all notification types and languages
 */

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check all Brevo environment variables
        const envVars = {
            BREVO_API_KEY: !!process.env.BREVO_API_KEY,
            BREVO_TEACHER_TEMPLATE_PL: process.env.BREVO_TEACHER_TEMPLATE_PL,
            BREVO_TEACHER_TEMPLATE_EN: process.env.BREVO_TEACHER_TEMPLATE_EN,
            BREVO_PARENT_TEMPLATE_PL: process.env.BREVO_PARENT_TEMPLATE_PL,
            BREVO_PARENT_TEMPLATE_EN: process.env.BREVO_PARENT_TEMPLATE_EN
        };

        // Get resolved template IDs with fallbacks
        const templateConfig = {
            teacher: {
                pl: {
                    value: parseInt(process.env.BREVO_TEACHER_TEMPLATE_PL || 2, 10),
                    source: process.env.BREVO_TEACHER_TEMPLATE_PL ? 'environment' : 'fallback',
                    envVar: 'BREVO_TEACHER_TEMPLATE_PL',
                    fallback: 2
                },
                en: {
                    value: parseInt(process.env.BREVO_TEACHER_TEMPLATE_EN || 4, 10),
                    source: process.env.BREVO_TEACHER_TEMPLATE_EN ? 'environment' : 'fallback',
                    envVar: 'BREVO_TEACHER_TEMPLATE_EN',
                    fallback: 4
                }
            },
            parent: {
                pl: {
                    value: parseInt(process.env.BREVO_PARENT_TEMPLATE_PL || 3, 10),
                    source: process.env.BREVO_PARENT_TEMPLATE_PL ? 'environment' : 'fallback',
                    envVar: 'BREVO_PARENT_TEMPLATE_PL',
                    fallback: 3
                },
                en: {
                    value: parseInt(process.env.BREVO_PARENT_TEMPLATE_EN || 5, 10),
                    source: process.env.BREVO_PARENT_TEMPLATE_EN ? 'environment' : 'fallback',
                    envVar: 'BREVO_PARENT_TEMPLATE_EN',
                    fallback: 5
                }
            }
        };

        // Instructions for setting up environment variables
        const instructions = {
            vercel: {
                dashboard: 'https://vercel.com/dashboard → Project Settings → Environment Variables',
                variables: [
                    { name: 'BREVO_TEACHER_TEMPLATE_PL', value: '2', description: 'Polish teacher notification template ID' },
                    { name: 'BREVO_TEACHER_TEMPLATE_EN', value: '4', description: 'English teacher notification template ID' },
                    { name: 'BREVO_PARENT_TEMPLATE_PL', value: '3', description: 'Polish parent notification template ID' },
                    { name: 'BREVO_PARENT_TEMPLATE_EN', value: '5', description: 'English parent notification template ID' }
                ]
            },
            benefits: [
                'Change template IDs without code deployment',
                'Different templates for staging/production',
                'Easy template management from Vercel dashboard',
                'Fallback values ensure system reliability'
            ]
        };

        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            environment: {
                variables: envVars,
                templates: templateConfig
            },
            setup: instructions
        });

    } catch (error) {
        console.error('Error checking Brevo environment variables:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
} 