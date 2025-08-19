/**
 * Hey Feelings - Membership Pricing Logic
 * Handles promotional URL parameters and dynamic pricing buttons based on Memberstack plans
 * Version: 1.6 - FINAL FIX: Webflow tab handling + duplicate IDs + robust scrolling
 */

// ========================================
// PROMOTIONAL LOGIC
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // --- Configuration ---
  const promoTabLinkId = 'promo-tab';
  const thanksToElementId = 'thanks-to';
  const pricingSectionId = 'pricing';
  const promoParamName = 'promo';
  const promoParamValue = 'yes'; // Expected value to trigger activation
  const thanksToParamName = 'thanks-to';
  const clickDelay = 200;        // Short delay for Webflow to initialize
  const scrollDelayAfterClick = 300; // Short delay before scroll

  // --- Get URL Parameters ---
  const urlParams = new URLSearchParams(window.location.search);
  const promoValue = urlParams.get(promoParamName);
  const thanksToValue = urlParams.get(thanksToParamName);

  // --- Find Primary Elements (handle duplicates) ---
  // Get the LINK element (a tag), not the div
  const promoTabLink = document.querySelector(`a#${promoTabLinkId}`);
  // Get ALL thanks-to elements (handle duplicates)
  const thanksToElements = document.querySelectorAll(`#${thanksToElementId}`);

  // --- Main Logic Branch: Check if Promo Activation is Needed ---
  if (promoValue === promoParamValue) {
    // --- Activation Logic ---
    if (promoTabLink) {
      // 1. Make the tab link visible
      promoTabLink.style.display = 'flex';
      
      // 2. Force remove any hiding classes
      promoTabLink.classList.remove('hidden-ui-elements');
      promoTabLink.classList.remove('hide');

      // 3. Wait for Webflow to initialize then click
      setTimeout(function() {
        // Use the already found link element instead of searching again
        if (promoTabLink) {
          // Force Webflow tab activation
          promoTabLink.click();
          
          // Mark tab as current (Webflow class)
          promoTabLink.classList.add('w--current');
          
          // Remove current from other tabs
          const monthlyTab = document.getElementById('monthly-tab-link');
          const yearlyTab = document.getElementById('yearly-tab-link');
          if (monthlyTab) monthlyTab.classList.remove('w--current');
          if (yearlyTab) yearlyTab.classList.remove('w--current');

          // --- Minimal, robust scroll to #pricing ---
          setTimeout(function() {
            const el = document.getElementById(pricingSectionId);
            if (el) {
              const y = window.pageYOffset + el.getBoundingClientRect().top; // no offset, bez smooth
              window.scrollTo(0, y);
            }
          }, scrollDelayAfterClick);
          // --- End minimal scroll ---
        }
      }, clickDelay);
    }
    // --- End Activation Logic ---
  }

  // --- Handle "Thanks To" Text (handle all duplicates) ---
  if (thanksToElements && thanksToElements.length > 0) {
    // Change text for ALL elements with this ID
    if (thanksToValue && thanksToValue.trim() !== '') {
      thanksToElements.forEach(element => {
        element.textContent = thanksToValue.trim();
      });
    }
  }
  
  // --- Set global flag to prevent tab override ---
  if (promoValue === promoParamValue) {
    window.promoTabActivated = true;
  }
});

// ========================================
// PRICING BUTTONS LOGIC
// ========================================
document.addEventListener("DOMContentLoaded", function () {

    // --- Configuration ---

    const freePlanIds = [
        "pln_free-plan-dhnb0ejd",
        "pln_educators-free-promo-ebfw0xzj",  // Educators Free Promo
        "pln_therapists-free-promo-i2kz0huu"  // Therapists Free Promo
    ];

    // Define paid tiers with UPDATED Price IDs, order, button IDs, and highlight DIV ID
    const paidTiers = [
        { // Order 1: Single Classroom Monthly ($19)
            id: "prc_educators-single-classroom-monthly-uum40cpj", order: 1, highlightDivId: "cp-sc-m",
            buttons: { upgrade: "single-classroom-monthly-upgrade", manage: "single-classroom-monthly-manage", downgrade: "single-classroom-monthly-downgrade" }
        },
        { // Order 2: School Bundle Monthly ($59)
            id: "prc_educators-school-bundle-monthly-64m30csk", order: 2, highlightDivId: "cp-sb-m",
            buttons: { upgrade: "school-bundle-monthly-upgrade", manage: "school-bundle-monthly-manage", downgrade: "school-bundle-monthly-downgrade" }
        },
        { // Order 3: Single Classroom Yearly ($159)
            id: "prc_educators-single-classroom-yearly-61a30cbh", order: 3, highlightDivId: "cp-sc-y",
            buttons: { upgrade: "single-classroom-yearly-upgrade", manage: "single-classroom-yearly-manage", downgrade: "single-classroom-yearly-downgrade" }
        },
        { // Order 4: School Bundle Yearly ($495)
            id: "prc_educators-school-bundle-yearly-ira20cnu", order: 4, highlightDivId: "cp-sb-y",
            buttons: { upgrade: "school-bundle-yearly-upgrade", manage: "school-bundle-yearly-manage", downgrade: "school-bundle-yearly-downgrade" }
        }
    ];

    // --- Tab Link IDs ---
    const monthlyTabId = "monthly-tab-link"; // Make sure this ID exists on your Monthly tab link
    const yearlyTabId = "yearly-tab-link";   // Make sure this ID exists on your Yearly tab link

    // --- Helper Functions ---

    function setButtonVisibility(buttonId, displayValue) {
        const button = document.getElementById(buttonId);
        if (button) {
            // Clear any existing inline styles first
            button.style.display = '';
            // Set new display value
            button.style.display = displayValue;
            // Force important if still hidden
            if (displayValue === 'block' && getComputedStyle(button).display === 'none') {
                button.style.setProperty('display', displayValue, 'important');
            }
        } else {
            // Check if there are multiple elements with same ID (duplikaty!)
            const duplicates = document.querySelectorAll(`#${buttonId}`);
            if (duplicates.length > 1) {
                duplicates.forEach((el, idx) => {
                    el.style.display = displayValue;
                });
            }
        }
    }

    function hideAllPricingButtons() {
        paidTiers.forEach(tier => {
            setButtonVisibility(tier.buttons.upgrade, 'none');
            setButtonVisibility(tier.buttons.manage, 'none');
            setButtonVisibility(tier.buttons.downgrade, 'none');
        });
    }

    function resetHighlighting() {
        const allPricingPlans = document.querySelectorAll('.pricing20_plan');
        allPricingPlans.forEach(plan => {
            plan.classList.remove('featured');
        });
        paidTiers.forEach(tier => {
            const divElement = document.getElementById(tier.highlightDivId);
            if (divElement) {
                divElement.style.display = 'none';
            }
        });
    }

    // --- Function to activate a tab ---
    function activateTab(tabIdToActivate) {
        const tabLink = document.getElementById(tabIdToActivate);
        if (tabLink) {
            if (!tabLink.classList.contains('w--current')) {
                // Wait a bit for Memberstack to finish loading
                setTimeout(function() {
                    tabLink.click(); // Simulate click
                    // Force Webflow current class
                    tabLink.classList.add('w--current');
                }, 300);
            }
        }
    }

    // --- Main Logic ---

    resetHighlighting();
    hideAllPricingButtons();
    // Default tab will be activated after member check

    if (!window.$memberstackDom) {
        paidTiers.forEach(tier => setButtonVisibility(tier.buttons.upgrade, 'block'));
        
        // Respect promo tab priority even when Memberstack unavailable  
        if (!window.promoTabActivated) {
            activateTab(yearlyTabId); // Activate default tab on MS error only if no promo
        }
        return;
    }

    window.$memberstackDom.getCurrentMember().then(({ data: member }) => {
        let currentUserTierOrder = null;
        let currentTierData = null;
        let activateMonthly = false; // Flag for tab switching

        // Determine currentUserTierOrder and currentTierData
        if (member && member.planConnections && member.planConnections.length > 0) {
            const activeConnections = member.planConnections.filter(conn => conn.active && conn.status === "ACTIVE");
            
            if (activeConnections.length > 0) {
                for (const conn of activeConnections) {
                    const priceIdToCheck = conn.priceId || (conn.payment ? conn.payment.priceId : null);
                    
                    if (priceIdToCheck) {
                         const matchedTier = paidTiers.find(tier => tier.id === priceIdToCheck);
                         if (matchedTier) {
                            currentUserTierOrder = matchedTier.order;
                            currentTierData = matchedTier;
                            // *** Check if the plan is monthly for tab switching ***
                            if (currentUserTierOrder === 1 || currentUserTierOrder === 2) {
                                activateMonthly = true;
                            }
                            break;
                         }
                    }
                }
                 if (currentUserTierOrder === null) { // Check free only if no paid plan found
                     for (const conn of activeConnections) { 
                         if (freePlanIds.includes(conn.planId)) { 
                             // Check if it's a FREE PROMO plan (educators or therapists)
                             if (conn.planId === 'pln_educators-free-promo-ebfw0xzj' || conn.planId === 'pln_therapists-free-promo-i2kz0huu') {
                                 // Find and highlight the featured free account plan
                                 const featuredFreePlan = document.querySelector('.pricing20_plan.featured-free-account');
                                 if (featuredFreePlan) {
                                     featuredFreePlan.classList.add('featured');
                                     
                                     // Also try to show any badges
                                     const badges = featuredFreePlan.querySelectorAll('.badge-numbers.featured');
                                     badges.forEach(badge => {
                                         badge.style.display = 'flex';
                                     });
                                 }
                             }
                             break; 
                         } 
                     }
                 }
            }
        }

        // Apply Button Visibility Rules
        paidTiers.forEach(tier => {
            if (currentUserTierOrder !== null) { // User on Paid Plan
                if (tier.order === currentUserTierOrder) {
                    setButtonVisibility(tier.buttons.manage, 'block'); setButtonVisibility(tier.buttons.upgrade, 'none'); setButtonVisibility(tier.buttons.downgrade, 'none');
                } else if (tier.order > currentUserTierOrder) {
                    setButtonVisibility(tier.buttons.upgrade, 'block'); setButtonVisibility(tier.buttons.manage, 'none'); setButtonVisibility(tier.buttons.downgrade, 'none');
                } else { // tier.order < currentUserTierOrder
                    setButtonVisibility(tier.buttons.downgrade, 'block'); setButtonVisibility(tier.buttons.upgrade, 'none'); setButtonVisibility(tier.buttons.manage, 'none');
                }
            } else { // User on Free Plan or Logged Out
                setButtonVisibility(tier.buttons.upgrade, 'block'); setButtonVisibility(tier.buttons.manage, 'none'); setButtonVisibility(tier.buttons.downgrade, 'none');
            }
        });

        // Apply Highlighting Rules
        if (currentTierData) {
            const manageButton = document.getElementById(currentTierData.buttons.manage);
            if (manageButton) {
                const cardElement = manageButton.closest('.pricing20_plan');
                if (cardElement) {
                    cardElement.classList.add('featured');
                    const highlightDiv = document.getElementById(currentTierData.highlightDivId);
                    if (highlightDiv) {
                        highlightDiv.style.display = 'flex'; // Use flex for alignment
                    }
                }
            }
        }

        // --- Activate Correct Tab (but respect promo tab priority) ---
        // Check if promo was activated by Script 1 - simple and reliable check
        if (!window.promoTabActivated) {
            // Only activate monthly/yearly if promo is NOT active
            if (activateMonthly) {
                activateTab(monthlyTabId); // Activate Monthly tab
            } else {
                activateTab(yearlyTabId); // Activate Yearly tab (default case)  
            }
        }
        // If promoTabActivated flag is set, skip tab activation entirely


    }).catch((error) => {
        resetHighlighting();
        hideAllPricingButtons();
        paidTiers.forEach(tier => setButtonVisibility(tier.buttons.upgrade, 'block'));
        
        // Respect promo tab priority even on error
        if (!window.promoTabActivated) {
            activateTab(yearlyTabId); // Activate default tab on fetch error only if no promo
        }
    });
});
