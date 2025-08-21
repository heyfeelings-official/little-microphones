// Little Microphones - Survey Validation & Plan Assignment
// Character validation, plan assignment, and success redirect for Educators and Therapists

(function() {
    'use strict';
    
    // Configuration
    const MIN_CHARACTERS = 500;
    const SUCCESS_REDIRECT_URL = '/members/emotion-worlds?survey=filled';
    const REDIRECT_DELAY = 1500;
    
    // Plan IDs based on user role
    const PLAN_IDS = {
        EDUCATOR: 'pln_educators-free-promo-ebfw0xzj',
        THERAPIST: 'pln_therapists-free-promo-i2kz0huu'
    };
    
    const textareas = [
        {
            id: 'Contact-Payments',
            counterId: 'char-payments',
            fieldName: 'payments',
            memberstackField: 'PAYMENTS'
        },
        {
            id: 'Contact-Resources', 
            counterId: 'char-resources',
            fieldName: 'resources',
            memberstackField: 'RESOURCES'
        },
        {
            id: 'Contact-Discover',
            counterId: 'char-discover', 
            fieldName: 'discover',
            memberstackField: 'DISCOVER'
        }
    ];
    
    let isInitialized = false;
    let isSubmitting = false;
    
    function initSurveyValidation() {
        if (isInitialized) return;
        
        console.log('🔍 Initializing survey validation for Educators and Therapists...');
        
        const submitButton = document.getElementById('survey-button');
        if (!submitButton) {
            console.log('❌ Submit button not found');
            return;
        }
        
        // Store original button text
        const originalButtonText = submitButton.textContent || submitButton.innerText || "Submit & unlock";
        
        // Set initial button state - disabled and gray
        submitButton.disabled = true;
        submitButton.style.backgroundColor = "#D3D3D3";
        submitButton.style.cursor = "not-allowed";
        submitButton.textContent = "Fill in the survey to unlock";
        
        // Track character counts for each textarea
        const characterCounts = {};
        
        // Initialize character counts
        textareas.forEach(textarea => {
            characterCounts[textarea.fieldName] = 0;
        });
        
        // Function to update character counter display
        function updateCharacterCounter(textareaConfig, count) {
            const counterElement = document.getElementById(textareaConfig.counterId);
            if (counterElement) {
                const isValid = count >= MIN_CHARACTERS;
                counterElement.textContent = `Min. ${MIN_CHARACTERS} characters / ${count} used.`;
                counterElement.style.color = isValid ? 'green' : 'red';
            }
        }
        
        // Function to check if all textareas meet minimum requirements
        function checkAllFieldsValid() {
            const allValid = textareas.every(textarea => {
                return characterCounts[textarea.fieldName] >= MIN_CHARACTERS;
            });
            
            if (allValid) {
                submitButton.disabled = false;
                submitButton.style.backgroundColor = "";
                submitButton.style.cursor = "pointer";
                submitButton.textContent = originalButtonText;
                console.log('✅ All fields valid - button enabled');
            } else {
                submitButton.disabled = true;
                submitButton.style.backgroundColor = "#D3D3D3";
                submitButton.style.cursor = "not-allowed";
                submitButton.textContent = "Fill in the survey to unlock";
            }
        }
        
        // Function to save custom fields to Memberstack
        async function saveCustomFields() {
            try {
                console.log('💾 Saving custom fields to Memberstack...');
                
                if (!window.$memberstackDom) {
                    console.log('❌ Memberstack DOM not available');
                    return false;
                }
                
                const member = await window.$memberstackDom.getCurrentMember();
                if (!member?.data) {
                    console.log('❌ No member data available');
                    return false;
                }
                
                const customFields = {};
                
                // Collect data from textareas
                textareas.forEach(textareaConfig => {
                    const textarea = document.getElementById(textareaConfig.id);
                    if (textarea && textarea.value.trim()) {
                        customFields[textareaConfig.memberstackField] = textarea.value.trim();
                    }
                });
                
                console.log('📝 Custom fields to save:', customFields);
                
                // Save custom fields using Memberstack API
                const updateResult = await window.$memberstackDom.updateMember({
                    customFields: customFields
                });
                
                console.log('✅ Custom fields saved successfully:', updateResult);
                return true;
                
            } catch (error) {
                console.error('❌ Error saving custom fields:', error);
                return false;
            }
        }
        
        // Function to detect user role from Memberstack (using same logic as other files)
        async function getUserRole() {
            try {
                console.log('🔍 Detecting user role...');
                
                // Check URL parameter for testing (e.g., ?role=therapist)
                const urlParams = new URLSearchParams(window.location.search);
                const urlRole = urlParams.get('role');
                if (urlRole) {
                    const normalizedUrlRole = urlRole.toUpperCase();
                    if (normalizedUrlRole === 'THERAPIST' || normalizedUrlRole === 'THERAPY') {
                        console.log('🔍 URL parameter override: THERAPIST');
                        return 'THERAPIST';
                    }
                    if (normalizedUrlRole === 'EDUCATOR' || normalizedUrlRole === 'TEACHER') {
                        console.log('🔍 URL parameter override: EDUCATOR');
                        return 'EDUCATOR';
                    }
                }
                
                if (!window.$memberstackDom) {
                    console.log('❌ Memberstack DOM not available');
                    return 'EDUCATOR'; // Default fallback
                }
                
                const { data: memberData } = await window.$memberstackDom.getCurrentMember();
                if (!memberData) {
                    console.log('❌ No member data available, defaulting to EDUCATOR');
                    return 'EDUCATOR';
                }
                
                // Log member data for debugging
                console.log('🔍 Member data:', {
                    planConnections: memberData.planConnections,
                    customFields: memberData.customFields,
                    metaData: memberData.metaData,
                    email: memberData.email
                });
                
                // Use the same logic as other files - detect role based on active Memberstack plans
                const planConnections = memberData.planConnections || [];
                const activePlans = planConnections.filter(conn => conn.active && conn.status === 'ACTIVE');
                const activePlanIds = activePlans.map(plan => plan.planId);
                
                console.log('🔍 Active plans:', activePlans);
                console.log('🔍 Active plan IDs:', activePlanIds);
                
                // Check if LM_CONFIG is available
                if (!window.LM_CONFIG?.PLAN_HELPERS) {
                    console.warn('⚠️ LM_CONFIG.PLAN_HELPERS not available, using fallback logic');
                    
                    // Fallback logic without config.js
                    const hasTherapistPlan = activePlanIds.some(planId => 
                        planId && (planId.includes('therapist') || planId.includes('therapy'))
                    );
                    
                    if (hasTherapistPlan) {
                        console.log('✅ Detected role: THERAPIST (fallback logic)');
                        return 'THERAPIST';
                    }
                    
                    console.log('✅ Detected role: EDUCATOR (fallback default)');
                    return 'EDUCATOR';
                }
                
                // Use config.js helper functions (same as other files)
                const hasParentPlan = activePlanIds.some(planId => 
                    window.LM_CONFIG.PLAN_HELPERS.isParentPlan(planId)
                );
                
                const hasTherapistPlan = activePlanIds.some(planId => 
                    window.LM_CONFIG.PLAN_HELPERS.isTherapistPlan(planId)
                );
                
                const hasEducatorPlan = activePlanIds.some(planId => 
                    window.LM_CONFIG.PLAN_HELPERS.isEducatorPlan(planId)
                );
                
                console.log('🔍 Plan detection results:', {
                    hasParentPlan,
                    hasTherapistPlan,
                    hasEducatorPlan
                });
                
                // Priority order: Parent > Therapist > Educator (same as other files)
                if (hasParentPlan) {
                    console.log('✅ Detected role: PARENT (but treating as EDUCATOR for survey)');
                    return 'EDUCATOR'; // Parents get educator survey
                } else if (hasTherapistPlan) {
                    console.log('✅ Detected role: THERAPIST');
                    return 'THERAPIST';
                } else if (hasEducatorPlan) {
                    console.log('✅ Detected role: EDUCATOR');
                    return 'EDUCATOR';
                } else {
                    console.log('✅ No active plans detected, defaulting to EDUCATOR');
                    return 'EDUCATOR';
                }
                
            } catch (error) {
                console.error('❌ Error detecting user role:', error);
                return 'EDUCATOR'; // Default fallback
            }
        }
        
        // Function to assign plan to member
        async function assignPlan() {
            try {
                console.log('🎯 Assigning plan to member...');

                const memberstack = window.$memberstackDom || window.memberstack;

                if (!memberstack) {
                    console.error('❌ Memberstack instance not found.');
                    return false;
                }
                
                if (typeof memberstack.addPlan !== 'function') {
                    console.error('❌ memberstack.addPlan is not a function.');
                    return false;
                }
                
                // Detect user role and get appropriate plan ID
                const userRole = await getUserRole();
                const planId = PLAN_IDS[userRole];
                
                console.log(`✅ User role: ${userRole}, Plan ID: ${planId}`);
                console.log(`🎯 Attempting to add plan: ${planId}`);
                
                // Fire and forget - trust the API call if it doesn't throw an error.
                // The returned data might not be immediately consistent.
                await memberstack.addPlan({ 
                    planId: planId 
                });
                
                console.log('✅ Plan assignment call succeeded. Verification will happen on the next page load.');
                return { success: true, planId: planId, userRole: userRole };
                
            } catch (error) {
                console.error('❌ Critical error calling addPlan:', error);
                return false;
            }
        }
        
        // Function to handle form submission
        async function handleFormSubmission(event) {
            if (isSubmitting) return;
            
            console.log('📝 Form submitted - processing...');
            isSubmitting = true;
            
            // Update button state to show processing
            submitButton.disabled = true;
            submitButton.textContent = "Processing...";
            submitButton.style.backgroundColor = "#96c0fe";
            
            // Process the submission
            try {
                // Save custom fields first
                const fieldsResult = await saveCustomFields();
                if (!fieldsResult) {
                    console.warn('⚠️ Could not save custom fields, but proceeding to plan assignment.');
                } else {
                    console.log('✅ Custom fields saved successfully.');
                }
                
                // Then assign plan
                const planResult = await assignPlan();
                if (!planResult || !planResult.success) {
                     console.error('❌ Plan assignment failed. Check previous logs for details.');
                } else {
                    console.log('✅ Plan assigned successfully.');
                    
                    // Set flag in localStorage to signal the destination page
                    try {
                        localStorage.setItem('educators_survey_completed', JSON.stringify({
                            timestamp: Date.now(),
                            planId: planResult.planId,
                            userRole: planResult.userRole,
                            redirectFrom: 'survey'
                        }));
                        console.log('📝 Set survey completion flag in localStorage');
                    } catch (storageError) {
                        console.warn('⚠️ Could not set localStorage flag:', storageError);
                    }
                }
                
                // Redirect to success page after a shorter delay
                console.log('⏳ Waiting 500ms before redirecting...');
                setTimeout(() => {
                    console.log('🎉 Redirecting to success page...');
                    window.location.href = SUCCESS_REDIRECT_URL;
                }, 500);
                
            } catch (error) {
                console.error('❌ Error during submission:', error);
                
                // Reset button state on error
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
                submitButton.style.backgroundColor = "";
                isSubmitting = false;
                
                // Still redirect on error - better UX
                setTimeout(() => {
                    console.log('🎉 Redirecting to success page (despite errors)...');
                    window.location.href = SUCCESS_REDIRECT_URL;
                }, REDIRECT_DELAY);
            }
        }
        
        // Add event listeners to each textarea
        textareas.forEach(textareaConfig => {
            const textarea = document.getElementById(textareaConfig.id);
            if (textarea) {
                console.log(`📝 Found textarea: ${textareaConfig.id}`);
                
                // Update character count on input
                textarea.addEventListener('input', function() {
                    const count = this.value.length;
                    characterCounts[textareaConfig.fieldName] = count;
                    updateCharacterCounter(textareaConfig, count);
                    checkAllFieldsValid();
                });
                
                // Initialize with current value
                const currentCount = textarea.value.length;
                characterCounts[textareaConfig.fieldName] = currentCount;
                updateCharacterCounter(textareaConfig, currentCount);
            } else {
                console.log(`❌ Textarea not found: ${textareaConfig.id}`);
            }
        });
        
        // Add form submission handler
        const form = submitButton.closest('form');
        if (form) {
            form.addEventListener('submit', function(event) {
                event.preventDefault(); // Prevent default form submission
                handleFormSubmission(event);
            });
            console.log('📋 Form submission handler added');
        } else {
            // Fallback: add click handler to button
            submitButton.addEventListener('click', function(event) {
                event.preventDefault();
                handleFormSubmission(event);
            });
            console.log('📋 Button click handler added');
        }
        
        // Initial validation check
        checkAllFieldsValid();
        
        isInitialized = true;
        console.log('✅ Survey validation initialized successfully for Educators and Therapists');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSurveyValidation);
    } else {
        initSurveyValidation();
    }
    
    // Backup initialization after page load
    window.addEventListener('load', function() {
        setTimeout(initSurveyValidation, 500);
    });
    
})();
