// Debug script to check page elements
console.log('🔍 Debugging page elements...');

// Check for recorder wrappers
const recorderWrappers = document.querySelectorAll('.recorder-wrapper');
console.log(`Found ${recorderWrappers.length} elements with .recorder-wrapper class`);

// Check for data-world attributes
const worldElements = document.querySelectorAll('[data-world]');
console.log(`Found ${worldElements.length} elements with data-world attribute`);

// Check for spookyland specific elements
const spookylandElements = document.querySelectorAll('[data-world="spookyland"]');
console.log(`Found ${spookylandElements.length} elements with data-world="spookyland"`);

// Check for potential recording elements
const recordButtons = document.querySelectorAll('.record-button, [data-element="record-button"]');
console.log(`Found ${recordButtons.length} record buttons`);

// Check for FAQ accordion elements (which might be the actual structure)
const faqElements = document.querySelectorAll('.faq1_accordion');
console.log(`Found ${faqElements.length} FAQ accordion elements`);

// Check for lm class elements
const lmElements = document.querySelectorAll('.lm');
console.log(`Found ${lmElements.length} elements with .lm class`);

// Check for combination
const faqLmElements = document.querySelectorAll('.faq1_accordion.lm');
console.log(`Found ${faqLmElements.length} elements with .faq1_accordion.lm classes`);

// Show what we actually have
if (faqLmElements.length > 0) {
    console.log('📋 Found FAQ LM elements:', faqLmElements);
    faqLmElements.forEach((el, index) => {
        console.log(`Element ${index + 1}:`, {
            id: el.id,
            classes: el.className,
            dataAttributes: Object.keys(el.dataset),
            dataset: el.dataset
        });
    });
}
