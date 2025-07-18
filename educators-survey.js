// Little Microphones - Educators Survey Validation & Plan Assignment
// Character validation, plan assignment, and success redirect

(function() {
    'use strict';
    
    // Configuration
    const MIN_CHARACTERS = 500;
    const SUCCESS_REDIRECT_URL = '/members/emotion-worlds?survey=filled';
    const REDIRECT_DELAY = 1500;
    const PLAN_ID = 'pln_educators-free-promo-ebfw0xzj';
    
    const textareas = [
        {
            id: 'textarea-payments',
            counterId: 'char-payments',
            fieldName: 'payments',
            memberstackField: 'PAYMENTS'
        },
        {
            id: 'textarea-resources', 
            counterId: 'char-resources',
            fieldName: 'resources',
            memberstackField: 'RESOURCES'
        },
        {
            id: 'textarea-discover',
            counterId: 'char-discover', 
            fieldName: 'discover',
            memberstackField: 'DISCOVER'
        }
    ];
    
    let isInitialized = false;
    let isSubmitting = false;
    
    function initSurveyValidation() {
        if (isInitialized) return;
        
        console.log('🔍 Initializing educators survey validation...');
        
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
        
        // Function to assign plan to member
        async function assignPlan() {
            try {
                console.log('🎯 Assigning plan to member...');
                
                if (!window.$memberstackDom) {
                    console.log('❌ Memberstack DOM not available');
                    return false;
                }
                
                // Multiple approaches for plan assignment
                try {
                    // Method 1: Direct plan purchase
                    const purchaseResult = await window.$memberstackDom.purchasePlan({
                        planId: PLAN_ID
                    });
                    console.log('✅ Plan assigned via purchase:', purchaseResult);
                    return true;
                } catch (purchaseError) {
                    console.log('⚠️ Purchase method failed:', purchaseError);
                    
                    // Method 2: Using member update
                    try {
                        const member = await window.$memberstackDom.getCurrentMember();
                        if (member?.data) {
                            const updateResult = await window.$memberstackDom.updateMember({
                                planConnections: [{
                                    planId: PLAN_ID,
                                    status: 'ACTIVE'
                                }]
                            });
                            console.log('✅ Plan assigned via update:', updateResult);
                            return true;
                        }
                    } catch (updateError) {
                        console.log('⚠️ Update method failed:', updateError);
                    }
                    
                    // Method 3: Direct API call
                    try {
                        const response = await fetch(`https://api.memberstack.com/v1/members/${member.data.id}/plans`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${window.$memberstackDom.config.publicKey}`
                            },
                            body: JSON.stringify({
                                planId: PLAN_ID
                            })
                        });
                        
                        if (response.ok) {
                            console.log('✅ Plan assigned via API call');
                            return true;
                        }
                    } catch (apiError) {
                        console.log('⚠️ API method failed:', apiError);
                    }
                }
                
                return false;
                
            } catch (error) {
                console.error('❌ Error assigning plan:', error);
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
                // Save custom fields
                const fieldsResult = await saveCustomFields();
                if (fieldsResult) {
                    console.log('✅ Custom fields saved successfully');
                }
                
                // Assign plan
                const planResult = await assignPlan();
                if (planResult) {
                    console.log('✅ Plan assigned successfully');
                }
                
                // Redirect to success page after delay
                setTimeout(() => {
                    console.log('🎉 Redirecting to success page...');
                    window.location.href = SUCCESS_REDIRECT_URL;
                }, REDIRECT_DELAY);
                
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
        console.log('✅ Educators survey validation initialized successfully');
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
