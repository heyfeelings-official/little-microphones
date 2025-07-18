// Little Microphones - Educators Survey Validation
// Simple character validation and button control

(function() {
    'use strict';
    
    // Configuration
    const MIN_CHARACTERS = 500;
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
    
    function initSurveyValidation() {
        if (isInitialized) return;
        
        console.log('🔍 Initializing survey validation...');
        
        const submitButton = document.getElementById('survey-button');
        if (!submitButton) {
            console.log('❌ Submit button not found');
            return;
        }
        
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
                submitButton.textContent = 'Submit & unlock';
                submitButton.style.cursor = 'pointer';
                console.log('✅ All fields valid - button enabled');
            } else {
                submitButton.disabled = true;
                submitButton.textContent = 'Complete all fields (min. 500 chars each)';
                submitButton.style.cursor = 'not-allowed';
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
        
        // Initial validation check
        checkAllFieldsValid();
        
        isInitialized = true;
        console.log('✅ Survey validation initialized successfully');
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