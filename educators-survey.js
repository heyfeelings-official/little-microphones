// Little Microphones - Educators Survey Validation & Submission
// Character validation, plan assignment, and success redirect

(function() {
    'use strict';
    
    // Configuration
    const MIN_CHARACTERS = 500;
    const EDUCATORS_FREE_PROMO_PLAN = 'pln_educators-free-promo-ebfw0xzj';
    const SUCCESS_REDIRECT_URL = '/members/emotion-worlds?survey=completed&unlock=6months&confetti=true';
    const REDIRECT_DELAY = 1500;
    
    const textareas = [
        {
            id: 'textarea-payments',
            counterId: 'char-payments',
            fieldName: 'payments'
        },
        {
            id: 'textarea-resources', 
            counterId: 'char-resources',
            fieldName: 'resources'
        },
        {
            id: 'textarea-discover',
            counterId: 'char-discover', 
            fieldName: 'discover'
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
        
        // Function to assign plan to user
        async function assignEducatorsPlan() {
            try {
                console.log('📋 Assigning educators free promo plan...');
                
                // Wait for Memberstack to be available
                if (!window.$memberstackDom) {
                    console.log('⏳ Waiting for Memberstack...');
                    await new Promise(resolve => {
                        const checkMemberstack = () => {
                            if (window.$memberstackDom) {
                                resolve();
                            } else {
                                setTimeout(checkMemberstack, 100);
                            }
                        };
                        checkMemberstack();
                    });
                }
                
                // Get current member
                const member = await window.$memberstackDom.getCurrentMember();
                if (!member || !member.data) {
                    throw new Error('No member found');
                }
                
                console.log('👤 Current member:', member.data.id);
                
                // Add plan to member
                await window.$memberstackDom.addPlanToMember({
                    planId: EDUCATORS_FREE_PROMO_PLAN
                });
                
                console.log('✅ Successfully assigned educators free promo plan');
                return true;
                
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
            
            // Update button state
            submitButton.disabled = true;
            submitButton.textContent = "Processing...";
            submitButton.style.backgroundColor = "#96c0fe";
            
            try {
                // Let Memberstack handle the form submission first
                // Don't prevent default - we want the form data to be saved
                
                // Assign the plan
                const planAssigned = await assignEducatorsPlan();
                
                if (planAssigned) {
                    console.log('✅ Plan assigned successfully');
                    submitButton.textContent = "Success! Redirecting...";
                    submitButton.style.backgroundColor = "#4CAF50";
                    
                    // Redirect to success page with confetti parameters
                    setTimeout(() => {
                        console.log('🎉 Redirecting to success page with confetti...');
                        window.location.href = SUCCESS_REDIRECT_URL;
                    }, REDIRECT_DELAY);
                } else {
                    console.log('❌ Plan assignment failed');
                    submitButton.textContent = "Error - Try again";
                    submitButton.style.backgroundColor = "#f44336";
                    
                    // Reset button after delay
                    setTimeout(() => {
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                        submitButton.style.backgroundColor = "";
                        isSubmitting = false;
                    }, 3000);
                }
                
            } catch (error) {
                console.error('❌ Error in form submission:', error);
                submitButton.textContent = "Error - Try again";
                submitButton.style.backgroundColor = "#f44336";
                
                // Reset button after delay
                setTimeout(() => {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                    submitButton.style.backgroundColor = "";
                    isSubmitting = false;
                }, 3000);
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
            form.addEventListener('submit', handleFormSubmission);
            console.log('�� Form submission handler added');
        } else {
            // Fallback: add click handler to button
            submitButton.addEventListener('click', handleFormSubmission);
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
