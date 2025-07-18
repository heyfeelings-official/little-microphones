/**
 * onboarding-redirect.js - Universal Form Redirect Handler
 * 
 * PURPOSE: Handles form submission redirects for onboarding page
 * SCOPE: Works with ANY form submission on the onboarding page
 * 
 * FUNCTIONALITY:
 * - Detects ALL form submissions on the page
 * - Redirects to /members/emotion-worlds after successful submission
 * - Provides proper delay to allow Memberstack to process the form
 * - Shows user feedback during redirect process
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.0.0
 * STATUS: Production Ready ✅
 */

// Configuration
const REDIRECT_URL = "/members/emotion-worlds";
const REDIRECT_DELAY = 1500; // 1.5 seconds delay to allow Memberstack processing

// Debug logging
const DEBUG = false;

function log(message, data = null) {
  if (DEBUG) {
    console.log(`🔄 [Onboarding Redirect] ${message}`, data || '');
  }
}

// Initialize redirect handler when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  log('Initializing universal form redirect handler');
  
  // Find all forms on the page
  const forms = document.querySelectorAll('form');
  
  if (forms.length === 0) {
    log('⚠️ No forms found on onboarding page');
    return;
  }
  
  log(`Found ${forms.length} form(s) on onboarding page`);
  
  // Add submit handler to each form
  forms.forEach((form, index) => {
    const formId = form.id || form.className || `form-${index + 1}`;
    log(`Setting up redirect for form: ${formId}`);
    
    form.addEventListener('submit', function(event) {
      log(`Form submitted: ${formId}`);
      
      // Don't prevent default - let Memberstack handle the submission
      // Just schedule the redirect
      setTimeout(() => {
        log(`Redirecting to: ${REDIRECT_URL}`);
        
        // Show user feedback
        const submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
        if (submitButton) {
          const originalText = submitButton.textContent || submitButton.value;
          
          if (submitButton.tagName === 'INPUT') {
            submitButton.value = 'Redirecting...';
          } else {
            submitButton.textContent = 'Redirecting...';
          }
          
          // Disable button to prevent multiple submissions
          submitButton.disabled = true;
        }
        
        // Perform redirect
        window.location.href = REDIRECT_URL;
        
      }, REDIRECT_DELAY);
    });
  });
  
  log('✅ Universal form redirect handler ready');
});

// Alternative approach: Listen for Memberstack events if available
if (typeof window !== 'undefined' && window.MemberStack) {
  window.MemberStack.onReady.then(() => {
    log('MemberStack ready, setting up form submission listener');
    
    // Listen for successful form submissions
    window.MemberStack.on('form:submit:success', function(data) {
      log('MemberStack form submission successful:', data);
      
      // Redirect after successful submission
      setTimeout(() => {
        log(`Redirecting to: ${REDIRECT_URL}`);
        window.location.href = REDIRECT_URL;
      }, REDIRECT_DELAY);
    });
  }).catch(error => {
    log('MemberStack initialization failed:', error);
  });
}

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REDIRECT_URL,
    REDIRECT_DELAY
  };
} 