/**
 * Educators Survey Script
 * 
 * PURPOSE: Handle survey form validation, Memberstack saving, and Brevo sync
 * USAGE: <script src="https://little-microphones.vercel.app/educators-survey.js"></script>
 * 
 * FEATURES:
 * - Validates 3 textarea fields with minimum character requirements
 * - Saves data to Memberstack custom fields
 * - Syncs with Brevo contact attributes
 * - Dynamic button state management
 * - Character counters with validation feedback
 * 
 * DEPENDENCIES: Memberstack
 * VERSION: 1.0.0
 * LAST UPDATED: January 2025
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('[Educators Survey] Script loaded');
    
    const SUCCESS_COLOR = 'green';
    const API_BASE_URL = 'https://little-microphones.vercel.app';

    // Get form elements
    const paymentsTextarea = document.getElementById('textarea-payments');
    const resourcesTextarea = document.getElementById('textarea-resources');
    const discoverTextarea = document.getElementById('textarea-discover');
    const surveyButton = document.getElementById('survey-button');
    const textareasToManage = [paymentsTextarea, resourcesTextarea, discoverTextarea];

    // Check if all required elements exist
    if (!paymentsTextarea || !resourcesTextarea || !discoverTextarea || !surveyButton) {
        console.error('[Educators Survey] Required elements not found');
        if (surveyButton) surveyButton.disabled = true;
        return;
    }

    console.log('[Educators Survey] All required elements found');

    const originalButtonText = surveyButton.textContent || surveyButton.innerText || "Submit";
    
    // Initial button state - disabled
    surveyButton.disabled = true;
    surveyButton.style.backgroundColor = "#D3D3D3";
    surveyButton.style.cursor = "not-allowed";
    surveyButton.textContent = "Fill in the survey to unlock";
    
    /**
     * Check if all textareas meet minimum character requirements
     */
    const checkAllTextareasValidityAndToggleButton = () => {
        let allAreValid = true;

        for (const textarea of textareasToManage) {
            if (!textarea) continue;

            const minCharsAttr = textarea.getAttribute('minchar');
            const minChars = parseInt(minCharsAttr, 10);

            if (isNaN(minChars) || minChars <= 0) {
                allAreValid = false;
                break;
            }

            if (textarea.value.length < minChars) {
                allAreValid = false;
                break;
            }
        }

        surveyButton.disabled = !allAreValid;
        
        if (allAreValid) {
            surveyButton.style.backgroundColor = "";
            surveyButton.style.cursor = "pointer";
            surveyButton.textContent = originalButtonText;
        } else {
            surveyButton.style.backgroundColor = "#D3D3D3";
            surveyButton.style.cursor = "not-allowed";
            surveyButton.textContent = "Fill in the survey to unlock";
        }
    };

    /**
     * Save survey data to Memberstack
     */
    const saveSurveyToMemberstack = async (surveyData) => {
        try {
            console.log('[Educators Survey] Saving to Memberstack:', surveyData);
            
            if (!window.MemberStack) {
                throw new Error('MemberStack not available');
            }

            // Update member custom fields
            await window.MemberStack.updateMember({
                customFields: {
                    'payments': surveyData.payments,
                    'resources': surveyData.resources,
                    'discover': surveyData.discover
                }
            });

            console.log('[Educators Survey] ✅ Saved to Memberstack');
            return true;

        } catch (error) {
            console.error('[Educators Survey] ❌ Error saving to Memberstack:', error);
            return false;
        }
    };

    /**
     * Sync survey data with Brevo
     */
    const syncSurveyWithBrevo = async (surveyData) => {
        try {
            console.log('[Educators Survey] Syncing with Brevo');
            
            const response = await fetch(`${API_BASE_URL}/api/memberstack-webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'member.updated',
                    data: {
                        customFields: {
                            'payments': surveyData.payments,
                            'resources': surveyData.resources,
                            'discover': surveyData.discover
                        }
                    }
                })
            });

            if (response.ok) {
                console.log('[Educators Survey] ✅ Synced with Brevo');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }

        } catch (error) {
            console.error('[Educators Survey] ❌ Error syncing with Brevo:', error);
            return false;
        }
    };

    /**
     * Handle form submission
     */
    const handleFormSubmission = async (event) => {
        event.preventDefault();
        
        console.log('[Educators Survey] Form submitted');
        
        // Disable button during processing
        surveyButton.disabled = true;
        surveyButton.textContent = "Processing...";
        
        try {
            // Collect survey data
            const surveyData = {
                payments: paymentsTextarea.value.trim(),
                resources: resourcesTextarea.value.trim(),
                discover: discoverTextarea.value.trim()
            };

            console.log('[Educators Survey] Survey data collected:', surveyData);

            // Save to Memberstack
            const memberstackSaved = await saveSurveyToMemberstack(surveyData);
            
            if (memberstackSaved) {
                // Sync with Brevo
                await syncSurveyWithBrevo(surveyData);
                
                // Show success
                surveyButton.textContent = "✅ Survey Completed!";
                surveyButton.style.backgroundColor = SUCCESS_COLOR;
                
                // Optional: redirect after success
                setTimeout(() => {
                    window.location.href = "/members/emotion-worlds";
                }, 2000);
                
            } else {
                throw new Error('Failed to save to Memberstack');
            }

        } catch (error) {
            console.error('[Educators Survey] ❌ Error processing form:', error);
            
            // Show error state
            surveyButton.textContent = "❌ Error - Try Again";
            surveyButton.style.backgroundColor = "#FF6B6B";
            
            // Re-enable button after 3 seconds
            setTimeout(() => {
                surveyButton.disabled = false;
                surveyButton.textContent = originalButtonText;
                surveyButton.style.backgroundColor = "";
            }, 3000);
        }
    };

    // Setup textarea validation and counters
    textareasToManage.forEach(textarea => {
        if (!textarea) return;

        const textareaId = textarea.id;
        const counterId = `char-${textareaId.split('-').slice(1).join('-')}`;
        const counterElement = document.getElementById(counterId);

        const updateCounter = () => {
            if (!counterElement) return;

            const currentLength = textarea.value.length;
            const minCharsAttr = textarea.getAttribute('minchar');
            const minChars = parseInt(minCharsAttr, 10);

            if (!isNaN(minChars) && minChars > 0) {
                const counterText = `Min. ${minChars} characters / ${currentLength} used.`;
                counterElement.textContent = counterText;
                
                if (currentLength >= minChars) {
                    counterElement.style.color = SUCCESS_COLOR;
                } else {
                    counterElement.style.color = '';
                }
            } else {
                counterElement.textContent = `${currentLength} characters used.`;
                counterElement.style.color = '';
            }
        };

        const updateValidityMessage = () => {
            const minCharsAttr = textarea.getAttribute('minchar');
            const minChars = parseInt(minCharsAttr, 10);
            
            if (!isNaN(minChars) && minChars > 0) {
                const currentLength = textarea.value.length;
                if (textarea.value.length > 0 && currentLength < minChars) {
                    textarea.setCustomValidity(`Please enter at least ${minChars} characters. You currently have ${currentLength}.`);
                } else {
                    textarea.setCustomValidity('');
                }
            } else {
                textarea.setCustomValidity('');
            }
        };

        textarea.addEventListener('input', () => {
            updateCounter();
            updateValidityMessage();
            checkAllTextareasValidityAndToggleButton();
        });

        updateCounter();
        updateValidityMessage();
    });

    // Add form submission handler
    const form = surveyButton.closest('form');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    } else {
        surveyButton.addEventListener('click', handleFormSubmission);
    }

    // Initial validation check
    checkAllTextareasValidityAndToggleButton();
    
    console.log('[Educators Survey] ✅ Script initialized');
}); 