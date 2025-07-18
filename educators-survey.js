// Little Microphones - Educators Survey Validation & Submission
// Character validation, plan assignment, and success redirect

(function() {
    'use strict';
    
    // Configuration
    const MIN_CHARACTERS = 500;
    const EDUCATORS_FREE_PROMO_PLAN = 'pln_educators-free-promo-ebfw0xzj';
    const SUCCESS_REDIRECT_URL = '/members/emotion-worlds?survey=completed&unlock=6months&confetti=true';
    const REDIRECT_DELAY = 2000; // Increased delay for plan assignment
    
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
        
        // Function to wait for MemberStack to be ready
        function waitForMemberStack() {
            return new Promise((resolve) => {
                if (window.MemberStack && window.MemberStack.onReady) {
                    window.MemberStack.onReady.then(resolve);
                } else {
                    // Fallback: wait for MemberStack to load
                    const checkMemberStack = () => {
                        if (window.MemberStack && window.MemberStack.onReady) {
                            window.MemberStack.onReady.then(resolve);
                        } else {
                            setTimeout(checkMemberStack, 100);
                        }
                    };
                    checkMemberStack();
                }
            });
        }
        
        // Function to assign plan to user
        async function assignEducatorsPlan() {
            try {
                console.log('📋 Assigning educators free promo plan...');
                
                // Wait for MemberStack to be ready
                await waitForMemberStack();
                
                // Use the correct MemberStack API
                const result = await window.MemberStack.addPlanToMember({
                    planId: EDUCATORS_FREE_PROMO_PLAN
                });
                
                console.log('✅ Plan assignment result:', result);
                console.log('✅ Successfully assigned educators free promo plan');
                return true;
                
            } catch (error) {
                console.error('❌ Error assigning plan:', error);
                
                // Try alternative method if available
                try {
                    if (window.$memberstackDom && window.$memberstackDom.addPlanToMember) {
                        console.log('📋 Trying alternative method...');
                        await window.$memberstackDom.addPlanToMember({
                            planId: EDUCATORS_FREE_PROMO_PLAN
                        });
                        console.log('✅ Successfully assigned plan via alternative method');
                        return true;
                    }
                } catch (altError) {
                    console.error('❌ Alternative method also failed:', altError);
                }
                
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
                // Don't prevent default - let Memberstack handle form submission first
                // This ensures custom fields are saved
                
                // Wait a bit for form to be processed
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Now assign the plan
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
                    console.log('⚠️ Plan assignment failed, but continuing with redirect');
                    submitButton.textContent = "Survey saved! Redirecting...";
                    submitButton.style.backgroundColor = "#FF9800";
                    
                    // Still redirect even if plan assignment failed
                    setTimeout(() => {
                        console.log('🎉 Redirecting to success page...');
                        window.location.href = SUCCESS_REDIRECT_URL;
                    }, REDIRECT_DELAY);
                }
                
            } catch (error) {
                console.error('❌ Error in form submission:', error);
                submitButton.textContent = "Survey saved! Redirecting...";
                submitButton.style.backgroundColor = "#FF9800";
                
                // Still redirect even if there's an error
                setTimeout(() => {
                    console.log('🎉 Redirecting to success page...');
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
            form.addEventListener('submit', handleFormSubmission);
            console.log('📋 Form submission handler added');
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
        setTimeout(initSurveyValidation, 1000); // Increased delay for MemberStack
    });
    
})();
