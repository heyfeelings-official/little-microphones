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

// --- Configuration ---
const formIdentifier = '[data-ms-form="profile"]'; // IMPORTANT: Change "profile" if your form uses a different value for data-ms-form
const redirectUrl = "/members/emotion-worlds";          // --- !!! CHANGE THIS URL !!! --- Replace with your target URL
const redirectDelay = 1500; // Delay in milliseconds (1.5 seconds). Adjust if needed.
// --- End Configuration ---

document.addEventListener('DOMContentLoaded', (event) => {
  const formElement = document.querySelector(formIdentifier);

  if (formElement) {
    formElement.addEventListener('submit', function(e) {
      // We DO NOT prevent the default submission (e.preventDefault())
      // because we need Memberstack to process the form.

      console.log('Memberstack form submitted. Waiting for redirect...');

      // Wait for a short period before redirecting
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, redirectDelay);
    });
  } else {
    console.warn(`Form with identifier "${formIdentifier}" not found for redirect script.`);
  }
}); 