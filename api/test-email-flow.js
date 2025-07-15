/**
 * api/test-email-flow.js - Test email notification flow
 * 
 * PURPOSE: Test the complete email notification flow for parent uploads
 * USAGE: GET /api/test-email-flow?lmid=139
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
        const { lmid } = req.query;
        
        if (!lmid) {
            return res.status(400).json({ error: 'Missing lmid parameter' });
        }

        console.log(`🔍 Testing email notification flow for LMID ${lmid}`);

        // Test 1: Get LMID data
        const lmidData = await getLmidData(lmid);
        console.log(`📧 LMID data retrieved:`, lmidData);
        
        if (!lmidData) {
            return res.status(404).json({ 
                error: 'LMID data not found',
                step: 'getLmidData'
            });
        }

        // Test 2: Simulate parent upload with member ID
        const parentMemberId = 'mem_sb_cmcxhyf90000h0wuw8muxf9iw'; // From test data
        const uploaderEmail = findParentEmailByMemberId(parentMemberId, lmidData.parentMemberIdToEmail, lmidData.parentEmails);
        
        console.log(`👨‍👩‍👧‍👦 Parent upload simulation:`, {
            parentMemberId,
            uploaderEmail,
            parentMemberIdToEmail: lmidData.parentMemberIdToEmail
        });

        // Test 3: Simulate email notification call
        const world = 'spookyland';
        const questionId = '9';
        const lang = 'pl';
        
        const templateData = {
            teacherName: lmidData.teacherName,
            world: translateWorldName(world, lang),
            lmid: lmid,
            schoolName: lmidData.schoolName,
            dashboardUrl: `https://hey-feelings-v2.webflow.io/${lang}/members/little-microphones`,
            radioUrl: `https://little-microphones.vercel.app/radio?ID=${lmidData.shareId}`,
            uploaderName: 'Rodzic',
            uploaderType: 'parent'
        };

        // Test 4: Send test notification to teacher
        let teacherNotificationResult = null;
        if (lmidData.teacherEmail) {
            try {
                teacherNotificationResult = await sendNotificationViaAPI({
                    recipientEmail: lmidData.teacherEmail,
                    recipientName: lmidData.teacherName,
                    notificationType: 'teacher',
                    language: lang,
                    templateData: templateData
                });
                console.log(`✅ Teacher notification sent successfully`);
            } catch (error) {
                console.error(`❌ Teacher notification failed:`, error);
                teacherNotificationResult = { error: error.message };
            }
        }

        // Test 5: Send test notification to other parents (exclude uploader)
        const otherParents = lmidData.parentEmails.filter(email => email !== uploaderEmail);
        let parentNotificationResults = [];
        
        if (otherParents.length > 0) {
            for (const parentEmail of otherParents) {
                try {
                    const result = await sendNotificationViaAPI({
                        recipientEmail: parentEmail,
                        recipientName: 'Rodzic',
                        notificationType: 'parent',
                        language: lang,
                        templateData: templateData
                    });
                    parentNotificationResults.push({ email: parentEmail, result: result });
                    console.log(`✅ Parent notification sent to ${parentEmail}`);
                } catch (error) {
                    console.error(`❌ Parent notification failed for ${parentEmail}:`, error);
                    parentNotificationResults.push({ email: parentEmail, error: error.message });
                }
            }
        }

        return res.status(200).json({
            success: true,
            lmid: lmid,
            test: {
                step1_lmidData: lmidData,
                step2_parentInfo: {
                    parentMemberId,
                    uploaderEmail,
                    otherParents
                },
                step3_templateData: templateData,
                step4_teacherNotification: teacherNotificationResult,
                step5_parentNotifications: parentNotificationResults
            }
        });
        
    } catch (error) {
        console.error('❌ Test error:', error);
        return res.status(500).json({ 
            error: 'Test failed',
            details: error.message,
            stack: error.stack
        });
    }
}

// Copy functions from upload-audio.js

/**
 * Get LMID data including teacher and parent email addresses
 */
async function getLmidData(lmid) {
    try {
        const baseUrl = 'https://little-microphones.vercel.app';
        console.log(`📡 [getLmidData] Making API call to: ${baseUrl}/api/lmid-operations`);
        
        const response = await fetch(`${baseUrl}/api/lmid-operations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'get',
                lmid: lmid
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ [getLmidData] API response error: ${response.status} - ${errorText}`);
            throw new Error(`Failed to fetch LMID data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📥 [getLmidData] API response data:`, data);
        
        if (!data.success) {
            console.error(`❌ [getLmidData] API returned error: ${data.error}`);
            throw new Error(`LMID data error: ${data.error}`);
        }
        
        const result = {
            lmid: lmid,
            teacherEmail: data.data.teacherEmail,
            teacherName: data.data.teacherName,
            schoolName: data.data.schoolName,
            parentEmails: data.data.parentEmails || [],
            parentMemberIdToEmail: data.data.parentMemberIdToEmail || {},
            shareId: data.data.shareId
        };
        
        console.log(`✅ [getLmidData] Successfully processed LMID ${lmid} data:`, result);
        return result;
        
    } catch (error) {
        console.error('❌ [getLmidData] Error fetching LMID data:', error);
        return null;
    }
}

/**
 * Find parent email by Member ID
 */
function findParentEmailByMemberId(memberId, parentMemberIdToEmail, parentEmails) {
    if (!parentMemberIdToEmail || typeof parentMemberIdToEmail !== 'object') {
        console.warn(`⚠️ Parent Member ID to Email mapping is null or invalid.`);
        return null;
    }
    
    const email = parentMemberIdToEmail[memberId];
    if (email) {
        return email;
    }
    
    console.warn(`⚠️ Member ID ${memberId} not found in parent mapping.`);
    return null;
}

/**
 * Send notification via API
 */
async function sendNotificationViaAPI(notificationData) {
    const response = await fetch('https://little-microphones.vercel.app/api/send-email-notifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Email API error: ${response.status} - ${errorData.error}`);
    }
    
    return await response.json();
}

/**
 * Translate world name
 */
function translateWorldName(world, language) {
    const translations = {
        pl: {
            'spookyland': 'Straszne Miasto',
            'waterpark': 'Aquapark',
            'shopping-spree': 'Centrum Handlowe',
            'amusement-park': 'Wesołe Miasteczko',
            'big-city': 'Wielkie Miasto',
            'neighborhood': 'Dzielnica'
        },
        en: {
            'spookyland': 'Spookyland',
            'waterpark': 'Waterpark',
            'shopping-spree': 'Shopping Spree',
            'amusement-park': 'Amusement Park',
            'big-city': 'Big City',
            'neighborhood': 'Neighborhood'
        }
    };
    
    return translations[language]?.[world] || world;
} 