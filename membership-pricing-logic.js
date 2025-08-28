/**
 * Hey Feelings - Membership Pricing Logic
 * Handles promotional URL parameters and dynamic pricing buttons based on Memberstack plans
 * Version: 1.4 - DEBUG: Tab priority + scrolling issues (temporary logging)
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
  const clickDelay = 150;        // Increased delay before simulated click
  const scrollDelayAfterClick = 300; // Increased delay after click before scroll

  // --- Get URL Parameters ---
  const urlParams = new URLSearchParams(window.location.search);
  const promoValue = urlParams.get(promoParamName);
  const thanksToValue = urlParams.get(thanksToParamName);

  // --- Find Primary Elements ---
  const promoTabLink = document.getElementById(promoTabLinkId);
  const thanksToElement = document.getElementById(thanksToElementId);

  // --- Main Logic Branch: Check if Promo Activation is Needed ---
  console.log('🎬 PROMO SCRIPT 1: Starting promotional logic check');
  console.log('🔍 URL params:', { promo: promoValue, thanksTo: thanksToValue });
  console.log('🎯 Elements found:', { 
    promoTab: !!promoTabLink, 
    thanksToEl: !!thanksToElement 
  });
  
  if (promoValue === promoParamValue) {
    console.log('✅ PROMO ACTIVATED: promo=yes detected!');
    // --- Activation Logic ---
    if (promoTabLink) {
      console.log('📱 Making promo tab visible and preparing to click');
      // 1. Make the tab link visible
      promoTabLink.style.display = 'flex'; // Use 'flex' as determined previously

      // 2. Click after delay
      setTimeout(function() {
        console.log('🔄 Attempting to click promo tab...');
        // Re-check element exists in case of dynamic changes
        const currentPromoTabLink = document.getElementById(promoTabLinkId);
        if (currentPromoTabLink) {
          console.log('🎯 Clicking promo tab NOW');
          currentPromoTabLink.click(); // Activate the tab

          // --- Simplified Robust Scrolling Logic ---
          setTimeout(function() {
            // Try to find the pricing section using multiple methods
            const pricingSection = document.getElementById(pricingSectionId) || 
                                  document.querySelector(`#${pricingSectionId}`) || 
                                  document.querySelector(`[data-section-id="${pricingSectionId}"]`);
                                  
            console.log('🎯 SCROLLING DEBUG: Found pricing section:', !!pricingSection);
                                  
            if (pricingSection) {
              // Multiple scroll attempts with increasing delays to handle animations
              const scrollAttempts = [
                { delay: 100, method: 'smooth' },
                { delay: 800, method: 'smooth' },
                { delay: 1500, method: 'immediate' },
                { delay: 2200, method: 'force' }
              ];
              
              scrollAttempts.forEach((attempt, index) => {
                setTimeout(() => {
                  console.log(`📍 Scroll attempt ${index + 1}/${scrollAttempts.length} (${attempt.method})`);
                  
                  try {
                    const rect = pricingSection.getBoundingClientRect();
                    const targetY = window.pageYOffset + rect.top - 100;
                    
                    if (attempt.method === 'smooth') {
                      window.scrollTo({ top: targetY, behavior: 'smooth' });
                    } else if (attempt.method === 'immediate') {
                      window.scrollTo(0, targetY);
                    } else if (attempt.method === 'force') {
                      // Force scrollIntoView as last resort
                      pricingSection.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start',
                        inline: 'nearest'
                      });
                    }
                    
                    console.log(`✅ Executed scroll to position ${targetY}`);
                  } catch (e) {
                    console.log(`❌ Scroll attempt ${index + 1} failed:`, e);
                  }
                }, attempt.delay);
              });
            }
          }, 200); // Shorter initial delay
          // --- End Scrolling Logic ---
        }
      }, clickDelay);
    }
    // --- End Activation Logic ---
  }

  // --- Handle "Thanks To" Text (Runs regardless of promo activation) ---
  console.log('📝 THANKS TO HANDLER: Processing thanks-to parameter');
  if (thanksToElement) {
    console.log('✅ Thanks-to element found');
    // Only change text if thanksToValue is present and not empty/whitespace
    if (thanksToValue && thanksToValue.trim() !== '') {
      console.log('🔄 Changing thanks-to text to:', thanksToValue.trim());
      thanksToElement.textContent = thanksToValue.trim();
    } else {
      console.log('⚠️ Thanks-to value is empty or missing');
    }
  } else {
    console.log('❌ Thanks-to element not found (id: thanks-to)');
  }
});

// ========================================
// PRICING BUTTONS LOGIC
// ========================================
document.addEventListener("DOMContentLoaded", function () {
    console.log('🎬 PRICING SCRIPT 2: Starting pricing buttons logic');

    // --- Configuration ---

    const freePlanIds = [
        "pln_free-plan-dhnb0ejd",
        "pln_educators-free-promo-ebfw0xzj",  // Educators Free Promo
        "pln_therapists-free-promo-i2kz0huu"  // Therapists Free Promo
    ];

    // Define paid tiers for EDUCATORS with UPDATED Price IDs, order, button IDs, and highlight DIV ID
    const educatorPaidTiers = [
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

    // Define paid tiers for THERAPISTS with Price IDs, order, button IDs, and highlight DIV ID
    const therapistPaidTiers = [
        { // Order 1: Single Practice Monthly
            id: "prc_single-practice-monthly-03vr095y", order: 1, highlightDivId: "cp-sp-m",
            buttons: { upgrade: "single-practice-monthly-upgrade", manage: "single-practice-monthly-manage", downgrade: "single-practice-monthly-downgrade" }
        },
        { // Order 2: Single Practice Yearly
            id: "prc_single-practice-yearly-d5ys0cfl", order: 2, highlightDivId: "cp-sp-y",
            buttons: { upgrade: "single-practice-yearly-upgrade", manage: "single-practice-yearly-manage", downgrade: "single-practice-yearly-downgrade" }
        }
    ];

    // --- Container IDs ---
    const educatorsPricingId = "educators-pricing";
    const therapistPricingId = "therapist-pricing";
    
    // --- Tab Link IDs ---
    const educatorTabIds = {
        monthly: "educators-monthly-tab-link",
        yearly: "educators-yearly-tab-link"
    };
    
    const therapistTabIds = {
        monthly: "therapists-monthly-tab-link", 
        yearly: "therapists-yearly-tab-link"
    };

    // --- User Role Detection Function ---
    async function detectUserRole() {
        try {
            console.log('🔍 Detecting user role for pricing logic...');
            
            if (!window.$memberstackDom) {
                console.log('❌ Memberstack DOM not available, defaulting to EDUCATOR');
                return 'EDUCATOR';
            }
            
            const { data: memberData } = await window.$memberstackDom.getCurrentMember();
            if (!memberData) {
                console.log('❌ No member data available, defaulting to EDUCATOR');
                return 'EDUCATOR';
            }
            
            // Use the same logic as other files - detect role based on active Memberstack plans
            const planConnections = memberData.planConnections || [];
            const activePlans = planConnections.filter(conn => conn.active && conn.status === 'ACTIVE');
            const activePlanIds = activePlans.map(plan => plan.planId);
            
            console.log('🔍 Active plan IDs for role detection:', activePlanIds);
            
            // Check if LM_CONFIG is available
            if (window.LM_CONFIG?.PLAN_HELPERS) {
                const hasTherapistPlan = activePlanIds.some(planId => 
                    window.LM_CONFIG.PLAN_HELPERS.isTherapistPlan(planId)
                );
                
                const hasEducatorPlan = activePlanIds.some(planId => 
                    window.LM_CONFIG.PLAN_HELPERS.isEducatorPlan(planId)
                );
                
                console.log('🔍 Plan detection results:', { hasTherapistPlan, hasEducatorPlan });
                
                if (hasTherapistPlan) {
                    console.log('✅ Detected role: THERAPIST');
                    return 'THERAPIST';
                } else if (hasEducatorPlan) {
                    console.log('✅ Detected role: EDUCATOR');
                    return 'EDUCATOR';
                }
            } else {
                // Fallback logic without config.js
                const hasTherapistPlan = activePlanIds.some(planId => 
                    planId && (planId.includes('therapist') || planId.includes('therapy'))
                );
                
                if (hasTherapistPlan) {
                    console.log('✅ Detected role: THERAPIST (fallback logic)');
                    return 'THERAPIST';
                }
            }
            
            console.log('✅ Detected role: EDUCATOR (default)');
            return 'EDUCATOR';
            
        } catch (error) {
            console.error('❌ Error detecting user role:', error);
            return 'EDUCATOR'; // Default fallback
        }
    }

    // --- Container Management Functions ---
    function showPricingContainer(containerIdToShow) {
        const educatorsContainer = document.getElementById(educatorsPricingId);
        const therapistContainer = document.getElementById(therapistPricingId);
        
        console.log('🎯 Container elements found:', {
            educators: !!educatorsContainer,
            therapist: !!therapistContainer,
            showingContainer: containerIdToShow
        });
        
        // Hide both containers first
        if (educatorsContainer) {
            educatorsContainer.style.display = 'none';
        }
        if (therapistContainer) {
            therapistContainer.style.display = 'none';
        }
        
        // Show the appropriate container
        const containerToShow = document.getElementById(containerIdToShow);
        if (containerToShow) {
            containerToShow.style.display = 'block';
            console.log(`✅ Showing ${containerIdToShow} container`);
        } else {
            console.error(`❌ Container ${containerIdToShow} not found`);
        }
    }

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

    function hideAllPricingButtons(paidTiers) {
        paidTiers.forEach(tier => {
            setButtonVisibility(tier.buttons.upgrade, 'none');
            setButtonVisibility(tier.buttons.manage, 'none');
            setButtonVisibility(tier.buttons.downgrade, 'none');
        });
        
        // Also hide the special therapist demo button
        setButtonVisibility('open-free-therapist-demo-account', 'none');
    }

    function resetHighlighting(paidTiers) {
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
                 tabLink.click(); // Simulate click
            }
        }
    }

    // --- Main Logic ---
    
    // First detect user role and show appropriate container
    detectUserRole().then(userRole => {
        console.log('🎯 User role detected:', userRole);
        
        // Determine which tiers, container, and tabs to use
        let paidTiers, containerToShow, tabIds;
        if (userRole === 'THERAPIST') {
            paidTiers = therapistPaidTiers;
            containerToShow = therapistPricingId;
            tabIds = therapistTabIds;
        } else {
            paidTiers = educatorPaidTiers;
            containerToShow = educatorsPricingId;
            tabIds = educatorTabIds;
        }
        
        // Show the appropriate pricing container
        showPricingContainer(containerToShow);
        
        // Reset highlighting and hide buttons for the selected tiers
        resetHighlighting(paidTiers);
        hideAllPricingButtons(paidTiers);
        
        // Default tab will be activated after member check
        if (!window.$memberstackDom) {
            paidTiers.forEach(tier => setButtonVisibility(tier.buttons.upgrade, 'block'));
            
            // Respect promo tab priority even when Memberstack unavailable
            const urlParams = new URLSearchParams(window.location.search);
            const promoValue = urlParams.get('promo');
            
            if (promoValue !== 'yes') {
                activateTab(tabIds.yearly); // Activate default yearly tab on MS error only if no promo
            }
            return;
        }

        // Continue with member data processing
        return window.$memberstackDom.getCurrentMember().then(({ data: member }) => {
            console.log('🔍 Processing member data for role:', userRole);
            
            // Continue with existing logic using the appropriate paidTiers and tabIds
        let currentUserTierOrder = null;
        let currentTierData = null;
        let activateMonthly = false; // Flag for tab switching

        // Determine currentUserTierOrder and currentTierData
        if (member && member.planConnections && member.planConnections.length > 0) {
            const activeConnections = member.planConnections.filter(conn => conn.active && conn.status === "ACTIVE");
            
            if (activeConnections.length > 0) {
                for (const conn of activeConnections) {
                    const priceIdToCheck = conn.priceId || (conn.payment ? conn.payment.priceId : null);
                    
                    console.log('🔍 Checking connection:', {
                        planId: conn.planId,
                        priceId: priceIdToCheck,
                        active: conn.active,
                        status: conn.status,
                        userRole: userRole
                    });
                    
                    if (priceIdToCheck) {
                         const matchedTier = paidTiers.find(tier => tier.id === priceIdToCheck);
                         console.log('🔍 Looking for tier match:', {
                             priceIdToCheck: priceIdToCheck,
                             foundTier: matchedTier,
                             availableTiers: paidTiers.map(t => ({ id: t.id, order: t.order, buttons: Object.keys(t.buttons) }))
                         });
                         
                         if (matchedTier) {
                            currentUserTierOrder = matchedTier.order;
                            currentTierData = matchedTier;
                            console.log('✅ Matched tier found:', {
                                tierOrder: currentUserTierOrder,
                                tierData: currentTierData,
                                buttons: currentTierData.buttons
                            });
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
                                 
                                 // Show special demo button for therapists on free plan
                                 if (conn.planId === 'pln_therapists-free-promo-i2kz0huu' && userRole === 'THERAPIST') {
                                     setButtonVisibility('open-free-therapist-demo-account', 'block');
                                     console.log('✅ Showing therapist demo button for free plan user');
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
        // Check if promo tab is already active instead of URL params
        const promoTabLink = document.getElementById('promo-tab');
        const isPromoTabActive = promoTabLink && 
                                 (promoTabLink.classList.contains('w--current') || 
                                  promoTabLink.style.display !== 'none');
        
        console.log('🔍 PROMO DEBUG:', {
            promoTabExists: !!promoTabLink,
            promoTabDisplay: promoTabLink ? promoTabLink.style.display : 'not found',
            promoTabClasses: promoTabLink ? promoTabLink.className : 'not found',
            isActive: isPromoTabActive,
            urlHasPromo: window.location.search.includes('promo=yes')
        });
        
        if (!isPromoTabActive) {
            // Only activate monthly/yearly if promo tab is NOT active
            if (activateMonthly) {
                console.log('🔄 Activating Monthly tab (no promo conflict)');
                activateTab(tabIds.monthly);
            } else {
                console.log('🔄 Activating Yearly tab (no promo conflict)');
                activateTab(tabIds.yearly);
            }
        } else {
            console.log('🚫 Skipping tab activation - promo tab is active');
        }
        // If promo tab active, let the promotional logic handle tab activation
        
        }); // Close member data processing promise
        
    }).catch((error) => {
        console.error('❌ Error in pricing logic:', error);
        
        // Fallback: show educators container and reset
        showPricingContainer(educatorsPricingId);
        resetHighlighting(educatorPaidTiers);
        hideAllPricingButtons(educatorPaidTiers);
        educatorPaidTiers.forEach(tier => setButtonVisibility(tier.buttons.upgrade, 'block'));
        
        // Respect promo tab priority even on error
        const urlParams = new URLSearchParams(window.location.search);
        const promoValue = urlParams.get('promo');
        
        if (promoValue !== 'yes') {
            activateTab(educatorTabIds.yearly); // Activate default tab on fetch error only if no promo
        }
    });
});
