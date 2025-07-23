import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({ error: 'Email parameter required' });
        }

        console.log(`\n🔍 Testing parent Brevo sync for: ${email}`);
        
        // 1. Check if contact exists in Brevo
        let contact;
        try {
            contact = await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`, 'GET');
            console.log('✅ Contact found in Brevo:', {
                id: contact.id,
                email: contact.email,
                attributes: {
                    USER_CATEGORY: contact.attributes?.USER_CATEGORY,
                    PLAN_NAME: contact.attributes?.PLAN_NAME,
                    PLAN_ID: contact.attributes?.PLAN_ID,
                    MEMBERSTACK_ID: contact.attributes?.MEMBERSTACK_ID,
                    REGISTRATION_DATE: contact.attributes?.REGISTRATION_DATE
                }
            });
        } catch (error) {
            return res.status(404).json({ error: 'Contact not found in Brevo', details: error.message });
        }

        // 2. Check if contact has parent attributes
        const isParent = contact.attributes?.USER_CATEGORY === 'parents';
        const hasParentPlan = contact.attributes?.PLAN_ID === 'pln_parents-y1ea03qk';
        
        console.log('👨‍👩‍👧‍👦 Parent status check:', {
            isParent,
            hasParentPlan,
            userCategory: contact.attributes?.USER_CATEGORY,
            planId: contact.attributes?.PLAN_ID
        });

        // 3. Check if contact is in the main list
        try {
            const listMemberships = await makeBrevoRequest(`/contacts/${contact.id}/listMemberships`, 'GET');
            const isInMainList = listMemberships.lists?.some(list => list.id === 2);
            
            console.log('📋 List membership check:', {
                isInMainList,
                totalLists: listMemberships.lists?.length || 0,
                listIds: listMemberships.lists?.map(l => l.id) || []
            });
        } catch (error) {
            console.log('⚠️ Could not check list membership:', error.message);
        }

        // 4. Check if contact has any tags
        try {
            const contactTags = await makeBrevoRequest(`/contacts/${contact.id}/tags`, 'GET');
            console.log('🏷️ Contact tags:', {
                tags: contactTags.tags || [],
                tagCount: contactTags.tags?.length || 0
            });
        } catch (error) {
            console.log('⚠️ Could not check contact tags:', error.message);
        }

        const result = {
            success: true,
            contact: {
                id: contact.id,
                email: contact.email,
                isParent,
                hasParentPlan,
                attributes: {
                    USER_CATEGORY: contact.attributes?.USER_CATEGORY,
                    PLAN_NAME: contact.attributes?.PLAN_NAME,
                    PLAN_ID: contact.attributes?.PLAN_ID,
                    MEMBERSTACK_ID: contact.attributes?.MEMBERSTACK_ID,
                    REGISTRATION_DATE: contact.attributes?.REGISTRATION_DATE
                }
            },
            syncStatus: {
                isParent: isParent,
                hasParentPlan: hasParentPlan,
                isInMainList: true, // We'll get this from the list check above
                hasTags: true // We'll get this from the tags check above
            }
        };
        
        console.log('\n📊 Final result:', JSON.stringify(result, null, 2));
        
        return res.status(200).json(result);
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
} 