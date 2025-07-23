/**
 * api/test-world-images.js - Test World Images Configuration
 * 
 * PURPOSE: Test endpoint to verify world images functionality before uploading real images to Brevo
 * USAGE: GET /api/test-world-images?world=spookyland&language=pl
 * 
 * PARAMETERS:
 * - world: World name (optional, defaults to all worlds)
 * - language: Language code (optional, defaults to both pl+en)
 * 
 * RESPONSES:
 * - Single world: Returns image data for specific world+language
 * - All worlds: Returns configuration status and all world images
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Test Tool
 */

import { 
    getWorldImageData, 
    getAllWorldsImageData, 
    validateWorldImagesConfig,
    WORLD_IMAGES_CONFIG 
} from '../utils/brevo-world-images.js';

export default async function handler(req, res) {
    // CORS headers for development
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
        const { world, language } = req.query;
        const requestId = Math.random().toString(36).substring(2, 15);
        
        console.log(`🧪 [${requestId}] Testing world images - World: ${world || 'all'}, Language: ${language || 'all'}`);
        
        // Validate world images configuration
        const validation = validateWorldImagesConfig();
        console.log(`🔍 [${requestId}] Configuration validation:`, validation);
        
        // Case 1: Test specific world + language
        if (world && language) {
            console.log(`🎯 [${requestId}] Testing specific world: ${world} (${language})`);
            
            const imageData = getWorldImageData(world, language);
            
            return res.status(200).json({
                success: true,
                requestId: requestId,
                testType: 'specific_world',
                parameters: { world, language },
                imageData: imageData,
                templateUsage: {
                    worldImageUrl: `{{params.worldImageUrl}} = ${imageData.worldImageUrl}`,
                    worldImageAlt: `{{params.worldImageAlt}} = ${imageData.worldImageAlt}`,
                    worldName: `{{params.worldName}} = ${imageData.worldName}`
                },
                validation: validation,
                configurationStatus: validation.isValid ? 'ready' : 'needs_setup'
            });
        }
        
        // Case 2: Test specific world (both languages)
        if (world && !language) {
            console.log(`🌍 [${requestId}] Testing world in both languages: ${world}`);
            
            const plData = getWorldImageData(world, 'pl');
            const enData = getWorldImageData(world, 'en');
            
            return res.status(200).json({
                success: true,
                requestId: requestId,
                testType: 'world_both_languages',
                parameters: { world },
                imageData: {
                    pl: plData,
                    en: enData
                },
                templateUsage: {
                    note: 'Use {{params.worldImageUrl}}, {{params.worldImageAlt}}, {{params.worldName}} in templates',
                    example_pl: `Polish: ${plData.worldName} - ${plData.worldImageUrl}`,
                    example_en: `English: ${enData.worldName} - ${enData.worldImageUrl}`
                },
                validation: validation
            });
        }
        
        // Case 3: Test specific language (all worlds)
        if (!world && language) {
            console.log(`🗣️ [${requestId}] Testing all worlds in language: ${language}`);
            
            const allWorldsData = getAllWorldsImageData(language);
            
            return res.status(200).json({
                success: true,
                requestId: requestId,
                testType: 'all_worlds_single_language',
                parameters: { language },
                worldsCount: allWorldsData.length,
                imageData: allWorldsData,
                validation: validation,
                readyWorlds: allWorldsData.filter(w => w.isSuccess).length,
                missingWorlds: allWorldsData.filter(w => !w.isSuccess).map(w => w.worldId)
            });
        }
        
        // Case 4: Full overview (all worlds, both languages)
        console.log(`📊 [${requestId}] Full configuration overview`);
        
        const plWorlds = getAllWorldsImageData('pl');
        const enWorlds = getAllWorldsImageData('en');
        
        return res.status(200).json({
            success: true,
            requestId: requestId,
            testType: 'full_overview',
            validation: validation,
            configurationSummary: {
                totalWorlds: Object.keys(WORLD_IMAGES_CONFIG).length,
                totalConfigurations: validation.totalExpected,
                readyConfigurations: validation.totalConfigured,
                missingConfigurations: validation.missing,
                isProductionReady: validation.isValid
            },
            worldsData: {
                pl: {
                    worlds: plWorlds,
                    ready: plWorlds.filter(w => w.isSuccess).length,
                    missing: plWorlds.filter(w => !w.isSuccess).map(w => w.worldId)
                },
                en: {
                    worlds: enWorlds,
                    ready: enWorlds.filter(w => w.isSuccess).length,
                    missing: enWorlds.filter(w => !w.isSuccess).map(w => w.worldId)
                }
            },
            nextSteps: validation.isValid ? [
                'Configuration is complete!',
                'All world images are ready for production',
                'You can now use world images in email templates'
            ] : [
                'Upload missing images to Brevo Media Library',
                'Copy image URLs from Brevo and update utils/brevo-world-images.js',
                `Missing configurations: ${validation.missing.join(', ')}`,
                'Run this test again to verify setup'
            ]
        });
        
    } catch (error) {
        console.error(`❌ Error testing world images:`, error);
        return res.status(500).json({
            success: false,
            error: 'Failed to test world images',
            details: error.message
        });
    }
} 