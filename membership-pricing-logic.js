/**
 * Hey Feelings - Membership Pricing Logic
 * Handles promotional URL parameters and dynamic pricing buttons based on Memberstack plans
 * Version: 1.0
 */

document.addEventListener('DOMContentLoaded', function() {
  
  // ========================================
  // PROMOTIONAL LOGIC
  // ========================================
  
  (function handlePromotionalLogic() {
    console.log('🎯 Initializing promotional logic...');
    
    // --- Configuration ---
    const promoTabLinkId = 'promo-tab';
    const thanksToElementId = 'thanks-to';
    const pricingSectionId = 'pricing';
    const promoParamName = 'promo';
    const promoParamValue = 'yes'; // Expected value to trigger activation
    const thanksToParamName = 'thanks-to';
    const clickDelay = 150;        // Increased delay before simulated click
    const scrollDelayAfterClick = 300; // Increased delay after click before scroll

    // --- Get URL Parameters ---
    const urlParams = new URLSearchParams(window.location.search);
    const promoValue = urlParams.get(promoParamName);
    const thanksToValue = urlParams.get(thanksToParamName);

    console.log('📊 URL Parameters:', { promo: promoValue, thanksTo: thanksToValue });

    // --- Find Primary Elements ---
    const promoTabLink = document.getElementById(promoTabLinkId);
    const thanksToElement = document.getElementById(thanksToElementId);

    // --- Main Logic Branch: Check if Promo Activation is Needed ---
    if (promoValue === promoParamValue) {
      console.log('🎉 Promotional activation detected!');
      
      // --- Activation Logic ---
      if (promoTabLink) {
        // 1. Make the tab link visible
        promoTabLink.style.display = 'flex'; // Use 'flex' as determined previously
        console.log('👁️ Promotional tab made visible');

        // 2. Click after delay
        setTimeout(function() {
          // Re-check element exists in case of dynamic changes
          const currentPromoTabLink = document.getElementById(promoTabLinkId);
          if (currentPromoTabLink) {
            currentPromoTabLink.click(); // Activate the tab
            console.log('🖱️ Promotional tab clicked');

            // --- Scrolling Logic (ONLY if activation happens) ---
            setTimeout(function() {
              // Try to find the pricing section using multiple methods
              const pricingSection = document.getElementById(pricingSectionId) || 
                                    document.querySelector(`#${pricingSectionId}`) || 
                                    document.querySelector(`[data-section-id="${pricingSectionId}"]`);
                                    
              if (pricingSection) {
                console.log('📜 Scrolling to pricing section');
                
                // Method 1: Use scrollIntoView with options
                try {
                  pricingSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start'
                  });
                } catch (e) {
                  // Method 2: Fallback to manual scrolling
                  try {
                    const yOffset = pricingSection.getBoundingClientRect().top + window.pageYOffset;
                    window.scrollTo({
                      top: yOffset,
                      behavior: 'smooth'
                    });
                  } catch (e2) {
                    // Method 3: Ultimate fallback
                    try {
                      window.scrollTo(0, pricingSection.offsetTop);
                    } catch (e3) {
                      console.warn('❌ All scrolling methods failed');
                    }
                  }
                }
              } else {
                console.warn('❌ Pricing section not found');
              }
            }, scrollDelayAfterClick);
          }
        }, clickDelay);
      } else {
        console.warn('❌ Promotional tab link not found');
      }
    }

    // --- Handle "Thanks To" Text (Runs regardless of promo activation) ---
    if (thanksToElement) {
      // Only change text if thanksToValue is present and not empty/whitespace
      if (thanksToValue && thanksToValue.trim() !== '') {
        thanksToElement.textContent = thanksToValue.trim();
        console.log('✏️ Thanks-to text updated:', thanksToValue.trim());
      }
    } else if (thanksToValue) {
      console.warn('❌ Thanks-to element not found, but value provided:', thanksToValue);
    }
    
    console.log('✅ Promotional logic initialized');
  })();

  // ========================================
  // PRICING BUTTONS LOGIC
  // ========================================
  
  (function handlePricingButtons() {
    console.log('💳 Initializing pricing buttons logic...');

    // --- Configuration ---
    const freePlanIds = [
        "pln_free-plan-dhnb0ejd",
        "pln_educators-free-promo-ebfw0xzj"
    ];

    // Define paid tiers with UPDATED Price IDs, order, button IDs, and highlight DIV ID
    const paidTiers = [
        { // Order 1: Single Classroom Monthly ($19)
            id: "prc_educators-single-classroom-monthly-uum40cpj", 
            order: 1, 
            highlightDivId: "cp-sc-m",
            buttons: { 
              upgrade: "single-classroom-monthly-upgrade", 
              manage: "single-classroom-monthly-manage", 
              downgrade: "single-classroom-monthly-downgrade" 
            }
        },
        { // Order 2: School Bundle Monthly ($59)
            id: "prc_educators-school-bundle-monthly-64m30csk", 
            order: 2, 
            highlightDivId: "cp-sb-m",
            buttons: { 
              upgrade: "school-bundle-monthly-upgrade", 
              manage: "school-bundle-monthly-manage", 
              downgrade: "school-bundle-monthly-downgrade" 
            }
        },
        { // Order 3: Single Classroom Yearly ($159)
            id: "prc_educators-single-classroom-yearly-61a30cbh", 
            order: 3, 
            highlightDivId: "cp-sc-y",
            buttons: { 
              upgrade: "single-classroom-yearly-upgrade", 
              manage: "single-classroom-yearly-manage", 
              downgrade: "single-classroom-yearly-downgrade" 
            }
        },
        { // Order 4: School Bundle Yearly ($495)
            id: "prc_educators-school-bundle-yearly-ira20cnu", 
            order: 4, 
            highlightDivId: "cp-sb-y",
            buttons: { 
              upgrade: "school-bundle-yearly-upgrade", 
              manage: "school-bundle-yearly-manage", 
              downgrade: "school-bundle-yearly-downgrade" 
            }
        }
    ];

    // --- Tab Link IDs ---
    const monthlyTabId = "monthly-tab-link";
    const yearlyTabId = "yearly-tab-link";

    console.log('📋 Configuration loaded:', {
      freePlans: freePlanIds.length,
      paidTiers: paidTiers.length,
      tabIds: { monthly: monthlyTabId, yearly: yearlyTabId }
    });

    // --- Helper Functions ---
    function setButtonVisibility(buttonId, displayValue) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.style.display = displayValue;
        }
    }

    function hideAllPricingButtons() {
        paidTiers.forEach(tier => {
            setButtonVisibility(tier.buttons.upgrade, 'none');
            setButtonVisibility(tier.buttons.manage, 'none');
            setButtonVisibility(tier.buttons.downgrade, 'none');
        });
        console.log('🙈 All pricing buttons hidden');
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
        console.log('🎨 All highlighting reset');
    }

    // --- Function to activate a tab ---
    function activateTab(tabIdToActivate) {
        const tabLink = document.getElementById(tabIdToActivate);
        if (tabLink) {
            if (!tabLink.classList.contains('w--current')) {
                console.log(`🔄 Activating tab: #${tabIdToActivate}`);
                tabLink.click(); // Simulate click
            }
        } else {
            console.warn(`❌ Tab link element with ID #${tabIdToActivate} not found.`);
        }
    }

    // --- Main Logic ---
    resetHighlighting();
    hideAllPricingButtons();

    // Check if Memberstack is available
    if (!window.$memberstackDom) {
        console.error("❌ Memberstack ($memberstackDom) is not available.");
        paidTiers.forEach(tier => setButtonVisibility(tier.buttons.upgrade, 'block'));
        activateTab(yearlyTabId); // Activate default tab on MS error
        return;
    }

    console.log('🔍 Fetching current member data...');

    window.$memberstackDom.getCurrentMember().then(({ data: member }) => {
        let currentUserTierOrder = null;
        let currentTierData = null;
        let activateMonthly = false; // Flag for tab switching

        console.log('👤 Member data received:', member ? 'Member found' : 'No member');

        // Determine currentUserTierOrder and currentTierData
        if (member && member.planConnections && member.planConnections.length > 0) {
            const activeConnections = member.planConnections.filter(conn => conn.active && conn.status === "ACTIVE");
            console.log(`📊 Active connections found: ${activeConnections.length}`);
            
            if (activeConnections.length > 0) {
                for (const conn of activeConnections) {
                    const priceIdToCheck = conn.priceId || (conn.payment ? conn.payment.priceId : null);
                    if (priceIdToCheck) {
                         const matchedTier = paidTiers.find(tier => tier.id === priceIdToCheck);
                         if (matchedTier) {
                            currentUserTierOrder = matchedTier.order;
                            currentTierData = matchedTier;
                            console.log(`💰 User is on paid tier: ${priceIdToCheck} (Order: ${currentUserTierOrder})`);
                            
                            // *** Check if the plan is monthly for tab switching ***
                            if (currentUserTierOrder === 1 || currentUserTierOrder === 2) {
                                activateMonthly = true;
                                console.log('📅 Monthly plan detected - will activate monthly tab');
                            }
                            break;
                         }
                    }
                }
                 if (currentUserTierOrder === null) { 
                     // Check free only if no paid plan found
                     for (const conn of activeConnections) { 
                         if (freePlanIds.includes(conn.planId)) { 
                             console.log(`🆓 User is on free plan: ${conn.planId}`); 
                             break; 
                         } 
                     }
                 }
            } else { 
                console.log("📋 Member has plan connections, but none are active."); 
            }
        } else { 
            console.log("👤 No member logged in or no plan connections found."); 
        }

        // Apply Button Visibility Rules
        console.log('🔧 Applying button visibility rules...');
        paidTiers.forEach(tier => {
            if (currentUserTierOrder !== null) { 
                // User on Paid Plan
                if (tier.order === currentUserTierOrder) {
                    // Current plan - show manage button
                    setButtonVisibility(tier.buttons.manage, 'block'); 
                    setButtonVisibility(tier.buttons.upgrade, 'none'); 
                    setButtonVisibility(tier.buttons.downgrade, 'none');
                    console.log(`✅ Tier ${tier.order}: Showing MANAGE button (current plan)`);
                } else if (tier.order > currentUserTierOrder) {
                    // Higher tier - show upgrade button
                    setButtonVisibility(tier.buttons.upgrade, 'block'); 
                    setButtonVisibility(tier.buttons.manage, 'none'); 
                    setButtonVisibility(tier.buttons.downgrade, 'none');
                    console.log(`⬆️ Tier ${tier.order}: Showing UPGRADE button`);
                } else { 
                    // Lower tier - show downgrade button
                    setButtonVisibility(tier.buttons.downgrade, 'block'); 
                    setButtonVisibility(tier.buttons.upgrade, 'none'); 
                    setButtonVisibility(tier.buttons.manage, 'none');
                    console.log(`⬇️ Tier ${tier.order}: Showing DOWNGRADE button`);
                }
            } else { 
                // User on Free Plan or Logged Out - show all upgrade buttons
                setButtonVisibility(tier.buttons.upgrade, 'block'); 
                setButtonVisibility(tier.buttons.manage, 'none'); 
                setButtonVisibility(tier.buttons.downgrade, 'none');
                console.log(`🆓 Tier ${tier.order}: Showing UPGRADE button (free user)`);
            }
        });

        // Apply Highlighting Rules
        if (currentTierData) {
            console.log('🎨 Applying highlighting to current plan...');
            const manageButton = document.getElementById(currentTierData.buttons.manage);
            if (manageButton) {
                const cardElement = manageButton.closest('.pricing20_plan');
                if (cardElement) {
                    cardElement.classList.add('featured');
                    const highlightDiv = document.getElementById(currentTierData.highlightDivId);
                    if (highlightDiv) {
                        highlightDiv.style.display = 'flex'; // Use flex for alignment
                        console.log('✨ Current plan highlighted successfully');
                    }
                }
            }
        }

        // --- Activate Correct Tab ---
        console.log('🗂️ Activating appropriate tab...');
        if (activateMonthly) {
            activateTab(monthlyTabId); // Activate Monthly tab
        } else {
            activateTab(yearlyTabId); // Activate Yearly tab (default case)
        }

        console.log('✅ Pricing buttons logic completed');

    }).catch((error) => {
        console.error("❌ Error fetching Memberstack member:", error);
        resetHighlighting();
        hideAllPricingButtons();
        paidTiers.forEach(tier => setButtonVisibility(tier.buttons.upgrade, 'block'));
        activateTab(yearlyTabId); // Activate default tab on fetch error
        console.log("🔄 Error occurred, showing default settings.");
    });
    
  })();

  console.log('🎯 Membership pricing logic fully initialized');
});
