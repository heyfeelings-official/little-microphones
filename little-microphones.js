/**
 * little-microphones.js - Main Dashboard Controller
 * 
 * PURPOSE: Dashboard controller orchestrating authentication and LMID management UI
 * DEPENDENCIES: LM Auth System (loaded globally), Webflow, API endpoints
 * DOCUMENTATION: See /documentation/little-microphones.js.md for complete system overview
 * 
 * BROWSER COMPATIBILITY:
 * - Uses traditional JavaScript (no ES6 modules) for Webflow compatibility
 * - Relies on utils/lm-auth.js being loaded first to access window.LMAuth
 * - All functions available as global objects for immediate execution
 * 
 * MAIN FUNCTIONS:
 * - Dashboard initialization with auth system integration
 * - LMID UI population from templates
 * - Delete operations with file cleanup
 * - Add new LMID with limit enforcement
 * - World navigation routing to /members/record
 * 
 * PERFORMANCE IMPROVEMENTS:
 * - Centralized authentication reduces redundant API calls
 * - Efficient DOM manipulation with minimal Webflow re-initialization
 * - Event delegation for dynamic content
 * 
 * URL STRUCTURE:
 * - Dashboard URL: /members/little-microphones (new)
 * - Dashboard URL: /members/lm (deprecated)
 * - Recording URLs: /members/record?world=X&lmid=Y
 * - Radio URLs: /little-microphones?ID=shareId (public access)
 * 
 * LAST UPDATED: January 2025
 * VERSION: 3.2.0 (Renamed from lm.js)
 * STATUS: Production Ready ✅
 */

(function() {
    'use strict';

    // Wait for DOM and required dependencies
    document.addEventListener("DOMContentLoaded", async () => {
        
        // Wait for auth system to be available
        if (!window.LMAuth) {
            console.error("❌ LMAuth not found - ensure utils/lm-auth.js is loaded first");
            showErrorMessage("Authentication system not loaded. Please refresh the page.");
            return;
        }
        
        try {
            // Initialize authentication system
            const authSystem = window.LMAuth.getAuthSystem();
            const authResult = await authSystem.initialize();
            
            if (!authResult.success) {
                console.error("❌ Authentication system initialization failed:", authResult.error);
                return;
            }

            if (!authResult.authenticated) {
                console.log("👤 User not authenticated - showing login state");
                return;
            }

            console.log(`✅ Dashboard initialized - ${authResult.lmidCount} LMID(s) loaded`);
            
            // Clean up any inline styles that might interfere with Webflow
            cleanupInlineStyles();
            
            // Setup required CSS styles first
            setupRequiredStyles();
            
            // Initialize UI with LMID data (includes background setup and animations)
            await initializeDashboardUI(authResult.lmids);
            
            // Setup event listeners
            setupEventListeners(authSystem);
            
            // Fix for Webflow's locale switcher stripping URL params
            setupLocaleSwitcherFix();
            
            // Hide delete buttons for parent users
            await hideDeleteButtonsForParents();
            
            // Additional safety: Re-hide buttons after a short delay to catch any dynamically added elements
            setTimeout(async () => {
                await hideDeleteButtonsForParents();
            }, 500);
            
        } catch (error) {
            console.error("💥 Dashboard initialization error:", error);
            showErrorMessage("Failed to initialize dashboard. Please refresh the page.");
        }
    });

    // Global state
    let currentUserRole = null;

    /**
     * Store event listeners to enable proper cleanup without cloning
     */
    const elementEventListeners = new WeakMap();

    /**
     * Animate new-rec elements into view with fade-in and slide-up
     * @param {HTMLElement} container - Container to search for .new-rec elements (optional)
     */
    function animateNewRecElements(container = document) {
        const newRecElements = container.querySelectorAll('.new-rec:not(.animate-in)');
        
        newRecElements.forEach((element, index) => {
            // Stagger animations by 100ms for each element
            setTimeout(() => {
                element.classList.add('animate-in');
            }, index * 100);
        });
    }

    /**
     * Animate badge-rec elements into view with fade-in and slide-up
     * @param {HTMLElement} container - Container to search for .badge-rec elements (optional)
     */
    function animateBadgeRecElements(container = document) {
        const badgeRecElements = container.querySelectorAll('.badge-rec:not(.animate-in)');
        
        // Filter out hidden elements (visibility already pre-calculated)
        const visibleBadgeElements = Array.from(badgeRecElements).filter(element => {
            const computedStyle = getComputedStyle(element);
            return computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
        });
        
        visibleBadgeElements.forEach((element, index) => {
            // Stagger animations by 100ms for each element
            setTimeout(() => {
                element.classList.add('animate-in');
            }, index * 100);
        });
    }

    /**
     * Animate background images from scale 1.1 to 1
     * @param {HTMLElement} container - Container to search for program containers (optional)
     */
    function animateBackgroundImages(container = document) {
        // Try both selectors to find program containers in cloned LMIDs
        const programContainers = container.querySelectorAll('[data-lmid] .program-container:not(.bg-animate-in)');
        
        programContainers.forEach((element, index) => {
            // Stagger animations by 50ms for each element
            setTimeout(() => {
                element.classList.add('bg-animate-in');
            }, index * 50);
        });
    }

    /**
     * Consolidated batch loading of ALL recording data (eliminates duplicate API calls)
     * @param {Array<string>} lmids - Array of LMID strings
     */
    async function batchLoadAllRecordingData(lmids) {
        // Collect all unique LMID/world combinations from DOM
        const worldCombinations = [];
        for (const lmid of lmids) {
            const lmidElement = document.querySelector(`[data-lmid="${lmid}"]`);
            if (!lmidElement) continue;
            
            const worldContainers = lmidElement.querySelectorAll('.program-container[data-world]');
            for (const worldContainer of worldContainers) {
                const world = worldContainer.getAttribute('data-world');
                if (world) {
                    worldCombinations.push({ lmid, world, worldContainer, lmidElement });
                }
            }
        }
        
        // Process ALL combinations in PARALLEL with Promise.all (much faster!)
        const promises = worldCombinations.map(({ lmid, world, worldContainer, lmidElement }) => {
            return (async () => {
                try {
                    // Single API call for this LMID/world combination
                    const lang = window.LM_CONFIG.getCurrentLanguage();
                    const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/list-recordings?world=${world}&lmid=${encodeURIComponent(lmid)}&lang=${encodeURIComponent(lang)}`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        const recordings = data?.recordings || [];
                        const hasRecordings = recordings.length > 0;
                        
                        // 1. Apply badge-rec visibility
                        const badgeRec = worldContainer.querySelector('.badge-rec');
                        if (badgeRec) {
                                                    if (hasRecordings) {
                            badgeRec.classList.add('show-badge');
                        } else {
                            badgeRec.classList.remove('show-badge');
                        }
                        }
                        
                        // 2. Apply new-rec and total counts (simplified for dashboard)
                        const newRecContainer = worldContainer.querySelector('.new-rec');
                        if (newRecContainer) {
                            // Update total count
                            const totalCountElement = newRecContainer.querySelector('.new-rec-number:not(.total)');
                            if (totalCountElement) {
                                totalCountElement.textContent = recordings.length;
                            }
                            
                            // For simplicity on dashboard, show all as "new" (detailed new count calculation is expensive)
                            const newCountElement = newRecContainer.querySelector('.new-rec-number.total');
                            const newCountContainer = newRecContainer.querySelector('.rec-text.new');
                            if (newCountElement && newCountContainer) {
                                if (recordings.length > 0) {
                                    newCountElement.textContent = recordings.length;
                                    newCountContainer.style.display = 'flex';
                                } else {
                                    newCountContainer.style.display = 'none';
                                }
                            }
                        }
                        
                        // 3. Setup ShareID and radio links for badge-rec elements
                        if (hasRecordings) {
                            const shareId = await getShareIdForWorldLmid(world, lmid);
                            if (shareId) {
                                const badgeRec = worldContainer.querySelector('.badge-rec');
                                if (badgeRec) {
                                    const radioUrl = `/little-microphones?ID=${shareId}`;
                                    badgeRec.style.cursor = 'pointer';
                                    badgeRec.onclick = (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        window.location.href = radioUrl;
                                    };
                                }
                            }
                        }
                        
                        // 4. Setup recording links for new-rec elements
                        const newRecElement = worldContainer.querySelector('.new-rec');
                        if (newRecElement) {
                            const recordingUrl = `/members/record?world=${world}&lmid=${lmid}`;
                            newRecElement.style.cursor = 'pointer';
                            newRecElement.onclick = (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markLmidWorldVisited(lmid);
                                window.location.href = recordingUrl;
                            };
                        }
                    } else {
                        // Silently handle API failures for cleaner console
                    }
                } catch (error) {
                    // Silently handle errors for cleaner console
                }
            })();
        });
        
        // Wait for ALL API calls to complete in parallel
        await Promise.all(promises);
        
        // Animate elements that are now visible
        setTimeout(() => {
            animateBadgeRecElements();
        }, 100);
    }

    // REMOVED: quickPreCalculateVisibility - replaced by consolidated batchLoadAllRecordingData

    // REMOVED: checkWorldForRecordings - functionality included in batchLoadAllRecordingData



    /**
     * Add event listener with cleanup tracking
     * @param {HTMLElement} element - Element to add listener to
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    function addTrackedEventListener(element, event, handler) {
        // Remove existing listener if any
        const existingListeners = elementEventListeners.get(element) || {};
        if (existingListeners[event]) {
            element.removeEventListener(event, existingListeners[event]);
        }
        
        // Add new listener
        element.addEventListener(event, handler);
        
        // Track the listener
        existingListeners[event] = handler;
        elementEventListeners.set(element, existingListeners);
    }



    // REMOVED: ShareID cache to ensure fresh data after radio play
    // const shareIdCache = new Map();

    /**
     * Clean up inline styles that might interfere with Webflow styling
     * This removes any position/z-index styles that were added by previous versions
     */
    function cleanupInlineStyles() {
        // Remove inline styles from badge-rec elements
        const badgeRecElements = document.querySelectorAll('.badge-rec');
        badgeRecElements.forEach(element => {
            element.style.removeProperty('position');
            element.style.removeProperty('z-index');
        });
        
        // Remove inline styles from new-rec elements  
        const newRecElements = document.querySelectorAll('.new-rec');
        newRecElements.forEach(element => {
            element.style.removeProperty('position');
            element.style.removeProperty('z-index');
        });
        
        // Cleaned up inline styles for badge-rec and new-rec elements
    }

    /**
     * Setup required CSS styles for badge-rec and new-rec elements
     * This ensures proper positioning and styling regardless of Webflow configuration
     */
    function setupRequiredStyles() {
        // Check if styles are already added
        if (document.getElementById('lm-dashboard-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'lm-dashboard-styles';
        style.textContent = `
            /* Hide template completely */
            #lm-slot {
                display: none !important;
                visibility: hidden !important;
            }
            
            /* Minimal essential styles - let Webflow handle most positioning */
            .program-container .badge-rec.w-inline-block {
                cursor: pointer;
            }
            
            .program-container .new-rec.w-inline-block {
                cursor: pointer;
                display: flex !important;
            }
            
            /* Ensure new-rec elements are always visible, badge-rec controlled by JS */
            .new-rec {
                display: flex !important;
            }
            
            /* Custom animation for new-rec elements */
            .new-rec {
                opacity: 0;
                transform: translateY(24px);
                transition: all 0.6s cubic-bezier(0.075, 0.82, 0.165, 1);
            }
            
            .new-rec.animate-in {
                opacity: 1;
                transform: translateY(0px);
            }
            
            /* Custom animation for badge-rec elements */
            .badge-rec {
                opacity: 0;
                transform: translateY(24px);
                transition: all 0.6s cubic-bezier(0.075, 0.82, 0.165, 1);
                display: none !important;
            }
            
            .badge-rec.animate-in {
                opacity: 1;
                transform: translateY(0px);
            }
            
            .badge-rec.show-badge {
                display: flex !important;
            }
            
            /* Background image animation - using background-size instead of transform to respect overflow */
            [data-lmid] .program-container {
                background-repeat: no-repeat;
                background-size: 110% !important;
                transition: background-size 0.8s cubic-bezier(0.075, 0.82, 0.165, 1) !important;
            }
            
            [data-lmid] .program-container.bg-animate-in {
                background-size: cover !important;
            }
        `;
        
        document.head.appendChild(style);
    }

    // --- User Role Detection Functions ---
    
    /**
     * Detect user role from Memberstack plan
     * @returns {Promise<string>} User role ('parent', 'teacher', or 'therapist')
     */
    async function detectUserRole() {
        if (currentUserRole) {
            return currentUserRole;
        }
        
        try {
            const memberstack = window.$memberstackDom;
            if (!memberstack) {
                console.warn('Memberstack not available, defaulting to teacher role');
                currentUserRole = 'teacher';
                return currentUserRole;
            }
            
            const { data: memberData } = await memberstack.getCurrentMember();
            if (!memberData) {
                console.warn('No member data available, defaulting to teacher role');
                currentUserRole = 'teacher';
                return currentUserRole;
            }
            
            // Detect role based on Memberstack plan using configuration
            const planConnections = memberData.planConnections || [];
            const activePlans = planConnections.filter(conn => conn.active && conn.status === 'ACTIVE');
            const activePlanIds = activePlans.map(plan => plan.planId);
            
            // Check user role based on plan type (specific order matters)
            const hasParentPlan = activePlanIds.some(planId => 
                window.LM_CONFIG?.PLAN_HELPERS?.isParentPlan(planId)
            );
            
            const hasTherapistPlan = activePlanIds.some(planId => 
                window.LM_CONFIG?.PLAN_HELPERS?.isTherapistPlan(planId)
            );
            
            const hasEducatorPlan = activePlanIds.some(planId => 
                window.LM_CONFIG?.PLAN_HELPERS?.isEducatorPlan(planId)
            );
            
            if (hasParentPlan) {
                currentUserRole = 'parent';
            } else if (hasTherapistPlan) {
                currentUserRole = 'therapist';
            } else if (hasEducatorPlan) {
                currentUserRole = 'teacher';
            } else {
                // Fallback: check metadata for explicit role override
                const metaRole = memberData.metaData?.role;
                if (metaRole === 'parent' || metaRole === 'teacher' || metaRole === 'therapist') {
                    currentUserRole = metaRole;
                    console.log(`User role detected from metadata override: ${currentUserRole}`);
                } else {
                    console.warn(`No recognizable plan found in: [${activePlanIds.join(', ')}], defaulting to teacher role`);
                    currentUserRole = 'teacher';
                }
            }
            
            console.log(`User role detected: ${currentUserRole} (active plans: [${activePlanIds.join(', ')}])`);
            return currentUserRole;
        } catch (error) {
            console.error('Error detecting user role:', error);
            currentUserRole = 'teacher';
            return currentUserRole;
        }
    }

    /**
     * Hide delete buttons and add LMID button for parent users
     * Parents should not be able to delete or create LMIDs - only teachers and therapists can
     */
    async function hideDeleteButtonsForParents() {
        const userRole = await detectUserRole();
        
        if (userRole === 'parent') {
            console.log('👨‍👩‍👧‍👦 Parent user detected - hiding delete and add buttons');
            
            // Hide all delete buttons with ID #lm-delete
            const deleteButtons = document.querySelectorAll('#lm-delete');
            deleteButtons.forEach(button => {
                button.style.display = 'none';
                button.style.visibility = 'hidden';
                button.setAttribute('aria-hidden', 'true');
            });
            
            // Also hide any delete buttons with class .lm-delete
            const deleteButtonsByClass = document.querySelectorAll('.lm-delete');
            deleteButtonsByClass.forEach(button => {
                button.style.display = 'none';
                button.style.visibility = 'hidden';
                button.setAttribute('aria-hidden', 'true');
            });
            
            // Hide the "Add LMID" button
            const addButton = document.getElementById('add-lmid');
            if (addButton) {
                addButton.style.display = 'none';
                addButton.style.visibility = 'hidden';
                addButton.setAttribute('aria-hidden', 'true');
            }
            
            // Also hide any add buttons with class .add-lmid
            const addButtonsByClass = document.querySelectorAll('.add-lmid');
            addButtonsByClass.forEach(button => {
                button.style.display = 'none';
                button.style.visibility = 'hidden';
                button.setAttribute('aria-hidden', 'true');
            });
            
            console.log(`👨‍👩‍👧‍👦 Hidden ${deleteButtons.length + deleteButtonsByClass.length} delete button(s) and ${addButtonsByClass.length + (addButton ? 1 : 0)} add button(s) for parent user`);
        } else {
            console.log(`👨‍🏫 ${userRole} user detected - delete and add buttons remain visible`);
        }
    }

    /**
     * Initialize dashboard UI with LMID data
     * 
     * TEMPLATE CLONING SYSTEM:
     * 1. Find and hide original template
     * 2. Clone template for each LMID
     * 3. Populate clone with LMID data
     * 4. Append to container
     * 5. Reinitialize Webflow interactions
     * 
     * @param {Array<string>} lmids - Array of LMID strings
     */
    async function initializeDashboardUI(lmids) {
        const template = document.getElementById("lm-slot");
        if (!template) {
            console.error("❌ Template element with ID 'lm-slot' not found");
            return;
        }

        // Template is hidden via CSS (#lm-slot)

        if (lmids.length === 0) {
            console.log("📝 No LMIDs to display");
            return;
        }

        const container = template.parentNode;
        if (!container) {
            console.error("❌ Could not find parent container for template");
            return;
        }

        console.log(`🔄 Creating UI elements for ${lmids.length} LMID(s)`);

        // Create UI elements for each LMID (without slow new recording check)
        for (const lmid of lmids) {
            const clone = await createLMIDElement(template, lmid, false); // Skip slow check initially
            if (clone) {
                container.appendChild(clone);
            }
        }

        // Reinitialize Webflow interactions
        reinitializeWebflow();
        
        // Setup world backgrounds for all containers - MUST BE BEFORE ANIMATIONS
        setupWorldBackgrounds();
        
        // Initialize dashboard tracking
        setTimeout(() => {
            initializeDashboardTracking();
        }, 50);
        
        // Start animations immediately for better UX (backgrounds are now set)
        setTimeout(() => {
            animateNewRecElements();
            animateBackgroundImages();
            // Note: badge-rec animations will happen after data loads
        }, 100);
        
        // Now batch-load ALL recording data in one pass (eliminates duplicate API calls)
        setTimeout(() => {
            batchLoadAllRecordingData(lmids);
        }, 200);
    }

    /**
     * Create LMID UI element from template
     * 
     * @param {HTMLElement} template - Template element
     * @param {string} lmid - LMID to populate
     * @param {boolean} loadNewRecordings - Whether to load new recording indicator (default: true)
     * @returns {HTMLElement} Populated clone
     */
    async function createLMIDElement(template, lmid, loadNewRecordings = true) {
        const clone = template.cloneNode(true);
        
        // Configure clone - simple approach, no animation support
        clone.style.display = "";
        clone.removeAttribute("id");
        clone.setAttribute("data-lmid", lmid);

        // Populate LMID number
        const numberElement = clone.querySelector("#lmid-number");
        if (numberElement) {
            numberElement.textContent = lmid;
            numberElement.removeAttribute("id");
        } else {
            console.warn(`⚠️ Could not find '#lmid-number' in template clone for LMID ${lmid}`);
        }
        
        // Setup new recording count indicator (conditionally)
        if (loadNewRecordings) {
            await setupNewRecordingIndicator(clone, lmid);
        } else {
            // Hide badge initially for faster loading - preserve Webflow positioning
            const newRecContainer = clone.querySelector("#new-rec, .new-rec");
            if (newRecContainer) {
                newRecContainer.removeAttribute("id");
                newRecContainer.classList.add("new-rec"); // Ensure class exists
                newRecContainer.style.display = 'none';
            }
        }
        
        // Clone created - no animation re-initialization needed
        
        // Hide delete buttons for parent users
        const userRole = await detectUserRole();
        if (userRole === 'parent') {
            const deleteButtons = clone.querySelectorAll('#lm-delete, .lm-delete');
            deleteButtons.forEach(button => {
                button.style.display = 'none';
                button.style.visibility = 'hidden';
                button.setAttribute('aria-hidden', 'true');
            });
        }
        
        return clone;
    }

    /**
     * Setup new recording count indicator for LMID element
     * @param {HTMLElement} clone - LMID element clone
     * @param {string} lmid - LMID number
     */
    async function setupNewRecordingIndicator(clone, lmid) {
        // Find all world containers in this LMID clone
        const worldContainers = clone.querySelectorAll('.program-container[data-world]');
        
        if (worldContainers.length === 0) {
            console.warn(`⚠️ LMID ${lmid}: No world containers found`);
            return;
        }
        
        // Setup badge for each world container in parallel (OPTIMIZED)
        const worldSetupPromises = Array.from(worldContainers).map(async (worldContainer) => {
            const world = worldContainer.getAttribute('data-world');
            if (!world) return;
            
            return setupWorldNewRecordingIndicator(worldContainer, lmid, world);
        }).filter(Boolean);
        
        // Wait for all worlds to complete in parallel
        await Promise.all(worldSetupPromises);
    }
    
    /**
     * Setup new recording indicator for a specific world container
     * @param {HTMLElement} worldContainer - World container element
     * @param {string} lmid - LMID number
     * @param {string} world - World name
     */
    async function setupWorldNewRecordingIndicator(worldContainer, lmid, world) {
        // Look for new elements in this world container
        const newRecContainer = worldContainer.querySelector(".new-rec");
        const badgeRec = worldContainer.querySelector(".badge-rec");
        
        // Find specific number elements in the correct structure
        // First .rec-text contains total answers count
        const totalRecNumber = worldContainer.querySelector(".new-rec .rec-text:not(.new) .new-rec-number");
        // Second .rec-text.new contains new answers count  
        const newRecNumber = worldContainer.querySelector(".new-rec .rec-text.new .new-rec-number");
        
        if (!newRecContainer) {
            return;
        }
        
        try {
            // Get recording counts for this specific world (parallel calls)
            const [newRecordingCount, totalRecordingCount, shareId] = await Promise.all([
                getNewRecordingCountForWorld(lmid, world),
                getTotalRecordingCountForWorld(lmid, world),
                getShareIdForWorldLmid(world, lmid)
            ]);
            
            // Update total recordings count (Answers)
            if (totalRecNumber) {
                totalRecNumber.textContent = totalRecordingCount.toString();
            }
            
            // Update new recordings count (New)
            if (newRecNumber) {
                newRecNumber.textContent = newRecordingCount.toString();
            }
            
            // Hide/show the "new" counter based on whether there are new recordings
            const newCountContainer = worldContainer.querySelector(".new-rec .rec-text.new");
            if (newCountContainer) {
                if (newRecordingCount > 0) {
                    newCountContainer.style.display = 'flex';
                } else {
                    newCountContainer.style.display = 'none';
                }
            }
            
            // Always show the new-rec container with counts (even if 0)
            newRecContainer.style.display = 'flex';
            
            // Badge-rec visibility is managed by quickPreCalculateVisibility - don't override it here
            // The detailed API data will be used for counts and click handlers only
            
            // Debug: Log what we found vs what badge-rec currently looks like
            if (badgeRec) {
                const currentDisplay = badgeRec.style.display;
                const currentComputedDisplay = getComputedStyle(badgeRec).display;
                console.log(`🔧 ${lmid}/${world}: API found ${totalRecordingCount} recordings, badge-rec display=${currentDisplay}, computed=${currentComputedDisplay}`);
            }
            
            // Setup .badge-rec click to radio page with ShareID
            if (badgeRec && shareId && totalRecordingCount > 0) {
                // Add tracked event listener (automatically removes duplicates)
                addTrackedEventListener(badgeRec, 'click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const radioUrl = `/little-microphones?ID=${shareId}`;
                    window.location.href = radioUrl;
                });
            }
            
            // Setup .new-rec click to recording page
            if (newRecContainer) {
                // Add tracked event listener (automatically removes duplicates)
                addTrackedEventListener(newRecContainer, 'click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    markLmidWorldVisited(lmid);
                    const recordingUrl = `/members/record?world=${world}&lmid=${lmid}`;
                    window.location.href = recordingUrl;
                });
            }
            
        } catch (error) {
            // Silently handle errors - don't spam console
        }
    }

    // REMOVED: batchLoadNewRecordingIndicators - replaced by consolidated batchLoadAllRecordingData

    /**
     * Update new recording badge for specific LMID (fast UI update)
     * @param {string} lmid - LMID number
     * @param {number} count - Count of new recordings
     */
    function updateNewRecordingBadge(lmid, count) {
        const lmidElement = document.querySelector(`[data-lmid="${lmid}"]`);
        if (!lmidElement) {
            console.warn(`⚠️ LMID element not found for ${lmid}`);
            return;
        }
        
        // Look for new-rec elements with class selectors (more reliable after setupNewRecordingIndicator)
        const newRecContainer = lmidElement.querySelector(".new-rec");
        const newRecNumber = lmidElement.querySelector(".new-rec-number");
        
        console.log(`🔍 LMID ${lmid} badge update: container found=${!!newRecContainer}, number found=${!!newRecNumber}`);
        
        if (count > 0) {
            // Show badge - only change display, preserve Webflow positioning
            if (newRecContainer) {
                newRecContainer.style.display = 'block';
            }
            if (newRecNumber) {
                newRecNumber.textContent = count.toString();
            }
            console.log(`✅ LMID ${lmid}: Showing badge with ${count} new recordings`);
        } else {
            // Hide badge - only change display, preserve Webflow positioning
            if (newRecContainer) {
                newRecContainer.style.display = 'none';
            }
            console.log(`🙈 LMID ${lmid}: Hiding badge (no new recordings)`);
        }
    }

    /**
     * Get count of new recordings for a specific LMID (localStorage only)
     * @param {string} lmid - LMID number
     * @returns {Promise<number>} Count of new recordings since user's last visit
     */
    async function getNewRecordingCountOptimized(lmid) {
        try {
            const currentMemberId = await getCurrentMemberId();
            
            if (!currentMemberId) {
                console.warn(`⚠️ No member ID available for new recording count`);
                return 0;
            }
            
            // Get user's last visit data from localStorage (fast)
            const lastVisitData = getUserLastVisitData(currentMemberId, lmid);
            
            // Count new recordings since last visit
            return await getNewRecordingCountWithUserContext(lmid, currentMemberId, lastVisitData);
            
        } catch (error) {
            console.warn(`⚠️ Error getting optimized count for LMID ${lmid}:`, error);
            return 0;
        }
    }
    
    /**
     * Get count of new recordings for a specific world in LMID
     * @param {string} lmid - LMID number
     * @param {string} world - World name
     * @returns {Promise<number>} Count of new recordings for this world since user's last visit
     */
    async function getNewRecordingCountForWorld(lmid, world) {
        try {
            const currentMemberId = await getCurrentMemberId();
            
            if (!currentMemberId) {
                console.warn(`⚠️ No member ID available for new recording count`);
                return 0;
            }
            
            // Get user's last visit data from localStorage
            const lastVisitData = getUserLastVisitData(currentMemberId, lmid);
            
            // Count new recordings for this specific world
            return await getNewRecordingCountForSpecificWorld(lmid, world, currentMemberId, lastVisitData);
            
        } catch (error) {
            console.warn(`⚠️ Error getting count for LMID ${lmid}, World ${world}:`, error);
            return 0;
        }
    }

    /**
     * Get user's last visit data from localStorage
     * @param {string} userId - User/Member ID
     * @param {string} lmid - LMID number
     * @returns {Object} Last visit data with timestamp for comparison
     */
    function getUserLastVisitData(userId, lmid) {
        try {
            const storageKey = `lm_user_visits_${userId}`;
            const userData = JSON.parse(localStorage.getItem(storageKey) || '{}');
            
            const lmidKey = `lmid_${lmid}`;
            const lmidData = userData[lmidKey] || {};
            
            // Use lastRecordingCheck as the baseline for "new" recordings
            // This is updated when user clicks on world or listens to radio
            const lastRecordingCheck = lmidData.lastRecordingCheck;
            
            // For new users, default to 7 days ago (show some recent activity)
            const defaultTimestamp = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            
            return {
                timestamp: lastRecordingCheck || defaultTimestamp,
                isNewUser: !lastRecordingCheck,
                lastDashboardView: lmidData.lastDashboardView,
                lastWorldVisit: lmidData.lastWorldVisit,
                lastRadioPlay: lmidData.lastRadioPlay
            };
        } catch (error) {
            console.warn('Error reading user visit data:', error);
            // Default to 7 days ago for new users
            return {
                timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                isNewUser: true,
                lastDashboardView: null,
                lastWorldVisit: null,
                lastRadioPlay: null
            };
        }
    }

    /**
     * Update user's last visit data in localStorage
     * @param {string} userId - User/Member ID
     * @param {string} lmid - LMID number
     * @param {string} context - Context of the visit ('dashboard', 'world_visit', 'radio_play')
     */
    function updateUserLastVisitData(userId, lmid, context = 'dashboard') {
        try {
            const storageKey = `lm_user_visits_${userId}`;
            const userData = JSON.parse(localStorage.getItem(storageKey) || '{}');
            
            const lmidKey = `lmid_${lmid}`;
            const now = new Date().toISOString();
            
            // Initialize if doesn't exist
            if (!userData[lmidKey]) {
                userData[lmidKey] = {
                    firstVisit: now,
                    lastDashboardView: null,
                    lastWorldVisit: null,
                    lastRadioPlay: null,
                    lastRecordingCheck: null // This determines "new" recordings baseline
                };
            }
            
            // Update specific context
            switch (context) {
                case 'dashboard':
                    userData[lmidKey].lastDashboardView = now;
                    // Dashboard view does NOT reset recording counter
                    break;
                case 'world_visit':
                    userData[lmidKey].lastWorldVisit = now;
                    // World visit does NOT reset recording counter (user may not listen)
                    break;
                case 'radio_play':
                    userData[lmidKey].lastRadioPlay = now;
                    // Radio play DOES reset recording counter (user actively listened)
                    userData[lmidKey].lastRecordingCheck = now;
                    break;
            }
            
            userData[lmidKey].updatedAt = now;
            localStorage.setItem(storageKey, JSON.stringify(userData));
            
            const resetNote = context === 'radio_play' ? ' (COUNTER RESET)' : ' (counter preserved)';
            console.log(`📝 Updated visit data for LMID ${lmid}, context: ${context}${resetNote}`);
            
        } catch (error) {
            console.warn('Error updating user visit data:', error);
        }
    }

    /**
     * Mark LMID world as visited (for analytics only, doesn't reset new recording counter)
     * @param {string} lmid - LMID number
     */
    async function markLmidWorldVisited(lmid) {
        const currentMemberId = await getCurrentMemberId();
        if (currentMemberId) {
            updateUserLastVisitData(currentMemberId, lmid, 'world_visit');
            
            console.log(`📊 Marked LMID ${lmid} world as visited (counter NOT reset)`);
        }
    }

    /**
     * Mark LMID radio as played when user clicks play on radio program
     * This resets the new recording counter
     * @param {string} lmid - LMID number
     */
    async function markLmidRadioPlayed(lmid) {
        const currentMemberId = await getCurrentMemberId();
        if (currentMemberId) {
            updateUserLastVisitData(currentMemberId, lmid, 'radio_play');
            
            // Refresh all indicators for this LMID (no cache, fresh data)
            await refreshNewRecordingIndicators();
        }
    }

    /**
     * Get current member ID for user context
     * @returns {Promise<string|null>} Member ID or null
     */
    async function getCurrentMemberId() {
        try {
            const memberstack = window.$memberstackDom;
            if (!memberstack) {
                return null;
            }
            
            const { data: memberData } = await memberstack.getCurrentMember();
            return memberData?.id || null;
        } catch (error) {
            console.error('Error getting member ID:', error);
            return null;
        }
    }

    /**
     * Fallback method for getting new recording count with user context
     * @param {string} lmid - LMID number
     * @param {string} userId - User/Member ID
     * @param {Object} lastVisitData - User's last visit data
     * @returns {Promise<number>} Count of new recordings
     */
    async function getNewRecordingCountWithUserContext(lmid, userId, lastVisitData) {
        try {
            const lang = window.LM_CONFIG.getCurrentLanguage();
            let totalNewRecordings = 0;
            
            // List of all worlds to check
            const worlds = ['spookyland', 'waterpark', 'shopping-spree', 'amusement-park', 'big-city', 'neighborhood'];
            
            // Check each world for recordings added since last visit
            for (const world of worlds) {
                try {
                    // Get ShareID for this world/LMID combination
                    const shareId = await getShareIdForWorldLmid(world, lmid);
                    if (!shareId) {
                        continue; // Skip if no ShareID found
                    }
                    
                    // Get current recordings for this world
                    const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/list-recordings?world=${world}&lmid=${lmid}&lang=${lang}`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            const currentRecordings = data.recordings || [];
                            
                            // Filter recordings added since last visit
                            const lastVisitTimestamp = new Date(lastVisitData.timestamp).getTime();
                            const newRecordings = currentRecordings.filter(recording => {
                                const recordingTime = recording.lastModified || 0;
                                return recordingTime > lastVisitTimestamp;
                            });
                            
                            totalNewRecordings += newRecordings.length;
                        }
                    }
                } catch (worldError) {
                    console.warn(`⚠️ Error checking world ${world} for LMID ${lmid}:`, worldError);
                    // Continue checking other worlds
                }
            }
            
            return totalNewRecordings;
        } catch (error) {
            console.error(`❌ Error calculating new recordings for LMID ${lmid}:`, error);
            return 0;
        }
    }
    
    /**
     * Get count of new recordings for a specific world
     * @param {string} lmid - LMID number
     * @param {string} world - World name
     * @param {string} userId - User ID
     * @param {Object} lastVisitData - Last visit data
     * @returns {Promise<number>} Count of new recordings for this world
     */
    async function getNewRecordingCountForSpecificWorld(lmid, world, userId, lastVisitData) {
        try {
            const lang = window.LM_CONFIG.getCurrentLanguage();
            
            // Get ShareID for this world/LMID combination
            const shareId = await getShareIdForWorldLmid(world, lmid);
            if (!shareId) {
                return 0; // No ShareID means no recordings possible
            }
            
            // Get current recordings for this world
            const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/list-recordings?world=${world}&lmid=${lmid}&lang=${lang}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const currentRecordings = data.recordings || [];
                    
                    // Filter recordings added since last visit
                    const lastVisitTimestamp = new Date(lastVisitData.timestamp).getTime();
                    const newRecordings = currentRecordings.filter(recording => {
                        const recordingTime = recording.lastModified || 0;
                        return recordingTime > lastVisitTimestamp;
                    });
                    
                    return newRecordings.length;
                }
            }
            
            return 0;
        } catch (error) {
            console.warn(`⚠️ Error checking world ${world} for LMID ${lmid}:`, error);
            return 0;
        }
    }

    /**
     * Get total count of recordings for a specific world
     * @param {string} lmid - LMID number
     * @param {string} world - World name
     * @returns {Promise<number>} Total count of recordings for this world
     */
    async function getTotalRecordingCountForWorld(lmid, world) {
        try {
            const lang = window.LM_CONFIG.getCurrentLanguage();
            
            // Get ShareID for this world/LMID combination
            const shareId = await getShareIdForWorldLmid(world, lmid);
            if (!shareId) {
                return 0; // No ShareID means no recordings possible
            }
            
            // Get all recordings for this world
            const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/list-recordings?world=${world}&lmid=${lmid}&lang=${lang}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const allRecordings = data.recordings || [];
                    return allRecordings.length;
                }
            }
            
            return 0;
        } catch (error) {
            console.warn(`⚠️ Error getting total count for world ${world}, LMID ${lmid}:`, error);
            return 0;
        }
    }

    /**
     * Initialize dashboard view tracking (called on page load)
     */
    async function initializeDashboardTracking() {
        const currentMemberId = await getCurrentMemberId();
        if (currentMemberId) {
            // Get all LMIDs on page and mark dashboard view (but don't reset counters)
            const lmidElements = document.querySelectorAll('[data-lmid]');
            lmidElements.forEach(element => {
                const lmid = element.getAttribute('data-lmid');
                if (lmid) {
                    updateUserLastVisitData(currentMemberId, lmid, 'dashboard');
                }
            });
            
            console.log(`📊 Initialized dashboard tracking for ${lmidElements.length} LMIDs`);
        }
    }

    /**
     * Get ShareID for a specific world/LMID combination
     * @param {string} world - World name
     * @param {string} lmid - LMID number
     * @returns {Promise<string|null>} ShareID or null if not found
     */
    async function getShareIdForWorldLmid(world, lmid) {
        try {
            const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/get-share-link?lmid=${lmid}&world=${world}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return data.shareId;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Setup event listeners for dashboard interactions
     * @param {Object} authSystem - Global auth system instance
     */
    function setupEventListeners(authSystem) {
        // Store auth system globally for event handlers
        window.LM_AUTH_SYSTEM = authSystem;
        
        // Secure deletion flow
        document.body.addEventListener("click", handleDeleteClick);
        
        // Remove old world navigation - now handled by individual elements
        // document.body.addEventListener("click", handleWorldNavigation);
        
        // Add new LMID
        const addButton = document.getElementById("add-lmid");
        if (addButton) {
            addButton.addEventListener("click", handleAddLMID);
        } else {
            console.error("❌ 'Add LMID' button not found - ensure button has ID 'add-lmid'");
        }
    }

    /**
     * Handle delete button clicks with comprehensive security
     * 
     * SECURE DELETION WORKFLOW:
     * 1. Identify delete target and LMID
     * 2. Show enhanced confirmation modal
     * 3. Delete files from cloud storage
     * 4. Update member metadata via API
     * 5. Remove UI element
     * 6. Handle errors with proper cleanup
     */
    async function handleDeleteClick(event) {
        const deleteButton = findDeleteButton(event.target);
        
        if (!deleteButton) return;

        // SECURITY: Check user role - parents cannot delete LMIDs
        const userRole = await detectUserRole();
        if (userRole === 'parent') {
            console.warn('👨‍👩‍👧‍👦 Parent user attempted to delete LMID - access denied');
            showErrorMessage('Parents cannot delete programs. Please contact your teacher for assistance.');
            return;
        }

        const itemToDelete = deleteButton.closest("[data-lmid]");
        if (!itemToDelete) {
            console.error("❌ Could not find parent element with 'data-lmid' attribute");
            return;
        }

        const lmidToDelete = itemToDelete.getAttribute("data-lmid");
        if (!lmidToDelete) {
            console.error("❌ Could not find LMID to delete");
            return;
        }
        
        console.log(`🗑️ Delete request for LMID: ${lmidToDelete} by ${userRole}`);
        
        // Enhanced confirmation with validation
        const confirmed = await showDeleteConfirmationModal(lmidToDelete);
        if (!confirmed) {
            console.log(`❌ Deletion cancelled for LMID ${lmidToDelete}`);
            return;
        }

        // Visual feedback for deletion in progress
        setDeletionInProgress(itemToDelete, deleteButton);
        
        try {
            // Get auth system and member data for deletion operation
            const authSystem = window.LM_AUTH_SYSTEM;
            const memberData = await authSystem.memberData.getMemberForLMIDOperation();
            
            // Delete associated files from cloud storage, now with language context
            await deleteCloudFiles(lmidToDelete, window.LM_CONFIG.getCurrentLanguage());
            
            // Prepare new LMID string
            const newLmidString = authSystem.lmidManager.removeLMIDFromMetadata(
                lmidToDelete, 
                memberData.currentLmids
            );

            // Call backend deletion API
            const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/lmid-operations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: 'delete',
                    memberId: memberData.memberId,
                    lmidToDelete: lmidToDelete,
                    newLmidString: newLmidString,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Server error during deletion");
            }

            // Success - remove UI element
            itemToDelete.remove();
            console.log(`✅ Successfully deleted LMID ${lmidToDelete}`);
            
            // Log parent cleanup results
            if (result.parentCleanup) {
                if (result.parentCleanup.success && result.parentCleanup.cleanedParents > 0) {
                    console.log(`👨‍👩‍👧‍👦 Parent cleanup: ${result.parentCleanup.cleanedParents} parent accounts updated`);
                    showSuccessMessage(`Program deleted successfully. ${result.parentCleanup.cleanedParents} parent account(s) were also updated.`);
                } else if (result.parentCleanup.cleanedParents === 0) {
                    console.log(`👨‍👩‍👧‍👦 Parent cleanup: No parent accounts needed updating`);
                    showSuccessMessage(`Program deleted successfully.`);
                } else {
                    console.warn(`⚠️ Parent cleanup failed: ${result.parentCleanup.message}`);
                    showSuccessMessage(`Program deleted successfully, but parent cleanup may have failed.`);
                }
            } else {
                showSuccessMessage(`Program deleted successfully.`);
            }

        } catch (error) {
            console.error(`💥 Failed to delete LMID ${lmidToDelete}:`, error);
            showErrorMessage(`Failed to delete LMID: ${error.message}`);
            
            // Reset UI state on error
            resetDeletionState(itemToDelete, deleteButton);
        }
    }

    /**
     * Handle world navigation clicks
     */
    function handleWorldNavigation(event) {
        const worldButton = event.target.closest("[data-world]");
        
        if (!worldButton) return;
        
        event.preventDefault();

        const world = worldButton.getAttribute("data-world");
        const programWrapper = worldButton.closest("[data-lmid]");

        if (!programWrapper) {
            console.error("❌ Could not find parent program for world link");
            showErrorMessage("Navigation error - please try again");
            return;
        }

        const lmid = programWrapper.getAttribute("data-lmid");
        
        // Only track world click for analytics, but DON'T reset new recording counter
        // Counter will reset only when user clicks play on radio program
        markLmidWorldVisited(lmid);
        
        const baseUrl = worldButton.getAttribute("href") || "/members/record";
        const newUrl = `${baseUrl}?world=${world}&lmid=${lmid}`;
        
        console.log(`🌍 Navigating to: ${newUrl}`);
        window.location.href = newUrl;
    }

    /**
     * Handle add new LMID button clicks
     */
    async function handleAddLMID() {
        const addButton = document.getElementById("add-lmid");
        
        try {
            // SECURITY: Check user role - parents cannot create LMIDs
            const userRole = await detectUserRole();
            if (userRole === 'parent') {
                console.warn('👨‍👩‍👧‍👦 Parent user attempted to create LMID - access denied');
                showErrorMessage('Parents cannot create new programs. Please contact your teacher for assistance.');
                return;
            }
            
            console.log(`➕ Add LMID request by ${userRole}`);
            
            // Get auth system and validate operation permissions
            const authSystem = window.LM_AUTH_SYSTEM;
            const validation = await authSystem.validateForOperation();
            
            if (!validation.success) {
                throw new Error(validation.error);
            }

            // Check LMID limit
            if (!validation.canCreateLMID) {
                const { currentCount, maxLmids } = validation.lmidStatus;
                throw new Error(`Maximum ${maxLmids} programs per user (currently ${currentCount}). Delete an existing program first.`);
            }

            // Set button state
            setButtonLoading(addButton, "Adding...");

            const memberData = validation.member;

            // Call backend creation API
            const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/lmid-operations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: 'add',
                    memberId: memberData.memberId,
                    memberEmail: memberData.memberEmail,
                    currentLmids: memberData.currentLmids,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Could not create new LMID");
            }

            const newLmid = result.lmid;
            console.log(`✅ Created LMID ${newLmid} with ShareIDs:`, result.shareIds);

            // Add new UI element
            await addNewLMIDToUI(newLmid);
            
            console.log(`🎉 Successfully added LMID ${newLmid}`);

        } catch (error) {
            console.error("💥 Failed to add new LMID:", error);
            showErrorMessage(`Failed to create new program: ${error.message}`);
        } finally {
            // Reset button state
            resetButtonState(addButton, "Create a new Program");
        }
    }

    /**
     * Preserves URL parameters when user switches language via Webflow's locale switcher.
     * This version uses event delegation to intercept clicks, making it more robust.
     */
    function setupLocaleSwitcherFix() {
        if (!window.location.search) return;
        document.body.addEventListener('click', function(event) {
            const link = event.target.closest('a.w-loc.w-dropdown-link');
            if (link) {
                event.preventDefault();
                event.stopPropagation();
                const newUrl = `${link.getAttribute('href')}${window.location.search}`;
                window.location.href = newUrl;
            }
        }, true);
    }

    /**
     * UTILITY FUNCTIONS
     */

    /**
     * Find delete button in event path
     */
    function findDeleteButton(target) {
        // Check direct target
        if (target.id === "lm-delete") {
            return target;
        }
        
        // Use closest() method
        const closest = target.closest("#lm-delete");
        if (closest) {
            return closest;
        }
        
        // Manual traversal fallback
        let currentElement = target.parentElement;
        while (currentElement && currentElement !== document.body) {
            if (currentElement.id === "lm-delete") {
                return currentElement;
            }
            currentElement = currentElement.parentElement;
        }
        
        return null;
    }

    /**
     * Delete files from cloud storage
     */
    async function deleteCloudFiles(lmid, lang) {
        try {
            console.log(`🗑️ Deleting cloud files for LMID ${lmid} in lang ${lang}`);
            
            const deleteFilesResponse = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/delete-audio`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deleteLmidFolder: true,
                    lmid: lmid,
                    lang: lang
                })
            });

            const deleteResult = await deleteFilesResponse.json();
            
            if (!deleteResult.success) {
                console.warn(`⚠️ File deletion warning for LMID ${lmid}:`, deleteResult.error);
            } else {
                console.log(`✅ Cloud files deleted for LMID ${lmid}`);
            }
            
        } catch (error) {
            console.error(`💥 File deletion error for LMID ${lmid}:`, error);
            // Don't throw - file deletion is not critical for LMID removal
        }
    }

    /**
     * Set visual feedback for deletion in progress
     */
    function setDeletionInProgress(itemElement, buttonElement) {
        // Highlight item being deleted
        itemElement.style.border = '3px solid #ff4444';
        itemElement.style.borderRadius = '8px';
        itemElement.style.transition = 'all 0.3s ease';
        itemElement.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.3)';
        itemElement.style.backgroundColor = 'rgba(255, 68, 68, 0.05)';
        
        // Set button state
        if (buttonElement.tagName.toLowerCase() === 'button') {
            buttonElement.disabled = true;
            buttonElement.textContent = "Deleting...";
        } else {
            buttonElement.style.pointerEvents = 'none';
            buttonElement.style.opacity = '0.6';
            buttonElement.setAttribute('data-original-text', buttonElement.textContent);
            buttonElement.textContent = "Deleting...";
        }
    }

    /**
     * Reset deletion state on error
     */
    function resetDeletionState(itemElement, buttonElement) {
        // Remove highlighting
        itemElement.style.border = '';
        itemElement.style.borderRadius = '';
        itemElement.style.transition = '';
        itemElement.style.boxShadow = '';
        itemElement.style.backgroundColor = '';
        
        // Reset button state
        if (buttonElement.tagName.toLowerCase() === 'button') {
            buttonElement.disabled = false;
            buttonElement.textContent = "Delete";
        } else {
            buttonElement.style.pointerEvents = '';
            buttonElement.style.opacity = '';
            const originalText = buttonElement.getAttribute('data-original-text') || 'Delete';
            buttonElement.textContent = originalText;
            buttonElement.removeAttribute('data-original-text');
        }
    }

    /**
     * Set button loading state
     */
    function setButtonLoading(button, text) {
        button.disabled = true;
        button.textContent = text;
    }

    /**
     * Reset button state
     */
    function resetButtonState(button, text) {
        button.disabled = false;
        button.textContent = text;
    }

    async function addNewLMIDToUI(newLmid) {
        const template = document.getElementById("lm-slot");
        const container = template.parentNode;
        
        if (!template || !container) {
            console.error("❌ Could not find template or container for new LMID");
            return;
        }

        const clone = await createLMIDElement(template, newLmid, false); // Skip duplicate API calls - batchLoadAllRecordingData handles this
        if (clone) {
            container.appendChild(clone);
            
            // Setup backgrounds for the new LMID FIRST (before animations)
            setupWorldBackgroundsForContainer(clone);
            
            // Start animations and data loading immediately (parallel for speed)
            setTimeout(() => {
                animateNewRecElements(clone);
                animateBackgroundImages(clone);
                // Load recording data in parallel with animations for faster UX
                batchLoadAllRecordingData([newLmid]);
            }, 50); // Reduced delay for faster response
        }
        
        reinitializeWebflow();
        
        // Ensure delete buttons are hidden for parent users in the new element
        await hideDeleteButtonsForParents();
    }

    /**
     * Reinitialize Webflow interactions
     */
    function reinitializeWebflow() {
        if (window.Webflow) {
            try {
                window.Webflow.destroy();
                window.Webflow.ready();
                window.Webflow.require("ix2").init();
                console.log("🔄 Webflow interactions reinitialized");
            } catch (error) {
                console.warn("⚠️ Webflow reinitialization warning:", error);
            }
        }
    }

    /**
     * Show error message to user
     */
    function showErrorMessage(message) {
        alert(message); // Simple implementation - could be enhanced with custom modal
    }

    /**
     * Show success message to user
     */
    function showSuccessMessage(message) {
        // Create a more pleasant success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 16px;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">✅</span>
                <span>${message}</span>
            </div>
        `;
        
        // Add animation keyframes if not already added
        if (!document.querySelector('#successNotificationStyles')) {
            const style = document.createElement('style');
            style.id = 'successNotificationStyles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    /**
     * Enhanced delete confirmation modal with validation
     * 
     * @param {string} lmidToDelete - The LMID to delete
     * @returns {Promise<boolean>} - True if confirmed, false if cancelled
     */
    function showDeleteConfirmationModal(lmidToDelete) {
        return new Promise((resolve) => {
            // Save current scroll position
            const currentScrollY = window.scrollY;
            
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: Arial, sans-serif;
            `;
            
            // Create modal content
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                text-align: center;
            `;
            
            modal.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h2 style="color: #d32f2f; margin: 0 0 20px 0; font-size: 24px;">WARNING</h2>
                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                    This will permanently delete the <strong>Radio Program ${lmidToDelete}</strong> and <strong>ALL associated recordings</strong>!
                </p>
                <p style="margin: 0 0 30px 0; font-size: 16px; color: #666;">
                    This action cannot be undone.
                </p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #666;">
                    To confirm, please type "delete" below:
                </p>
                <input type="text" id="deleteConfirmInput" placeholder="Type 'delete' to confirm" 
                       style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; margin-bottom: 20px; box-sizing: border-box;">
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="cancelBtn" style="padding: 12px 24px; border: 2px solid #666; background: white; color: #666; border-radius: 6px; cursor: pointer; font-size: 16px;">
                        Cancel
                    </button>
                    <button id="confirmBtn" style="padding: 12px 24px; border: none; background: #ccc; color: white; border-radius: 6px; cursor: not-allowed; font-size: 16px;" disabled>
                        Delete Forever
                    </button>
                </div>
            `;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // Get elements
            const input = modal.querySelector('#deleteConfirmInput');
            const confirmBtn = modal.querySelector('#confirmBtn');
            const cancelBtn = modal.querySelector('#cancelBtn');
            
            // Focus on input
            const focusDelay = window.LM_CONFIG?.TIMEOUTS?.FOCUS_DELAY || 100;
            setTimeout(() => input.focus(), focusDelay);
            
            // Validate input in real-time
            input.addEventListener('input', () => {
                const value = input.value.toLowerCase();
                if (value === 'delete') {
                    confirmBtn.disabled = false;
                    confirmBtn.style.cssText = 'padding: 12px 24px; border: none; background: #d32f2f; color: white; border-radius: 6px; cursor: pointer; font-size: 16px;';
                    input.style.borderColor = '#4caf50';
                } else {
                    confirmBtn.disabled = true;
                    confirmBtn.style.cssText = 'padding: 12px 24px; border: none; background: #ccc; color: white; border-radius: 6px; cursor: not-allowed; font-size: 16px;';
                    input.style.borderColor = value.length > 0 ? '#f44336' : '#ddd';
                }
            });
            
            // Handle Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !confirmBtn.disabled) {
                    cleanup();
                    resolve(true);
                } else if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                }
            });
            
            // Handle buttons
            confirmBtn.addEventListener('click', () => {
                if (!confirmBtn.disabled) {
                    cleanup();
                    resolve(true);
                }
            });
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            // Handle overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });
            
            // Cleanup function
            function cleanup() {
                document.body.removeChild(overlay);
                window.scrollTo(0, currentScrollY);
            }
        });
    }

    /**
     * Setup world background videos for all world containers on the main page
     * Uses the same logic as radio.js but applies it to multiple containers
     */
    function setupWorldBackgrounds() {
        // All available worlds from config
        const worlds = Object.keys(window.LM_CONFIG?.WORLD_IMAGES || {});
        
        // Setting up world backgrounds for containers
        
        // Method 1: Handle ALL containers with explicit data-world attributes (prioritize visible ones)
        worlds.forEach(world => {
            // Use querySelectorAll to get ALL containers for this world
            const containers = document.querySelectorAll(`.program-container[data-world="${world}"]`);
            
            if (containers.length > 0) {
                containers.forEach((container, index) => {
                    // Skip hidden templates (display: none or visibility: hidden)
                    const styles = getComputedStyle(container);
                    const isVisible = styles.display !== 'none' && 
                                    styles.visibility !== 'hidden' && 
                                    styles.opacity !== '0';
                    
                    if (isVisible) {
                        setWorldBackgroundForContainer(container, world);
                    }
                });
            }
        });
        
        // Method 2: Handle containers without data-world by detecting from text content
        const containersWithoutDataWorld = document.querySelectorAll('.program-container:not([data-world])');
        
        containersWithoutDataWorld.forEach((container, index) => {
            // Skip hidden templates
            const styles = getComputedStyle(container);
            const isVisible = styles.display !== 'none' && 
                            styles.visibility !== 'hidden' && 
                            styles.opacity !== '0';
            
            if (!isVisible) {
                return;
            }
            
            const textContent = container.textContent.toLowerCase().trim();
            
            // Try to detect world from text content
            const worldPatterns = {
                'spookyland': ['spookyland', 'spooky'],
                'shopping-spree': ['shopping spree', 'shopping', 'spree'],
                'waterpark': ['waterpark', 'water park'],
                'neighborhood': ['neighborhood', 'neighbourhood'],
                'big-city': ['big city', 'city'],
                'amusement-park': ['amusement park', 'amusement', 'funfair']
            };
            
            for (const [world, patterns] of Object.entries(worldPatterns)) {
                if (patterns.some(pattern => textContent.includes(pattern))) {
                    setWorldBackgroundForContainer(container, world);
                    break;
                }
            }
        });
    }

    /**
     * Setup world backgrounds for a specific container (used for new LMID)
     * @param {HTMLElement} parentContainer - Parent container to search within
     */
    function setupWorldBackgroundsForContainer(parentContainer) {
        // All available worlds from config
        const worlds = Object.keys(window.LM_CONFIG?.WORLD_IMAGES || {});
        
        // Method 1: Handle containers with explicit data-world attributes
        worlds.forEach(world => {
            const containers = parentContainer.querySelectorAll(`.program-container[data-world="${world}"]`);
            
            if (containers.length > 0) {
                containers.forEach((container) => {
                    // Skip hidden templates (display: none or visibility: hidden)
                    const styles = getComputedStyle(container);
                    const isVisible = styles.display !== 'none' && 
                                    styles.visibility !== 'hidden' && 
                                    styles.opacity !== '0';
                    
                    if (isVisible) {
                        setWorldBackgroundForContainer(container, world);
                    }
                });
            }
        });
        
        // Method 2: Handle containers without data-world by detecting from text content
        const containersWithoutDataWorld = parentContainer.querySelectorAll('.program-container:not([data-world])');
        
        containersWithoutDataWorld.forEach((container) => {
            // Skip hidden templates
            const styles = getComputedStyle(container);
            const isVisible = styles.display !== 'none' && 
                            styles.visibility !== 'hidden' && 
                            styles.opacity !== '0';
            
            if (!isVisible) {
                return;
            }
            
            const textContent = container.textContent.toLowerCase().trim();
            
            // Try to detect world from text content
            const worldPatterns = {
                'spookyland': ['spookyland', 'spooky'],
                'shopping-spree': ['shopping spree', 'shopping', 'spree'],
                'waterpark': ['waterpark', 'water park'],
                'neighborhood': ['neighborhood', 'neighbourhood'],
                'big-city': ['big city', 'city'],
                'amusement-park': ['amusement park', 'amusement', 'funfair']
            };
            
            for (const [world, patterns] of Object.entries(worldPatterns)) {
                if (patterns.some(pattern => textContent.includes(pattern))) {
                    setWorldBackgroundForContainer(container, world);
                    break;
                }
            }
        });
    }

    /**
     * Set world background video for a specific container
     * Adapted from radio.js setWorldBackground and setupVideoBackground functions
     * @param {HTMLElement} container - The container element
     * @param {string} world - World name (e.g., 'spookyland')
     */
    function setWorldBackgroundForContainer(container, world) {
        if (!world || !container) return;
        
        // Get image URL from config
        const imageUrl = window.LM_CONFIG?.WORLD_IMAGES?.[world];
        
        if (imageUrl) {
            // Remove any existing video elements
            const existingVideo = container.querySelector('.world-bg-video');
            if (existingVideo) {
                existingVideo.remove();
            }
            
            // Set static background image (preserve existing Webflow positioning)
            container.style.backgroundImage = `url('${imageUrl}')`;
            // Only set background-position if not already set by Webflow
            if (!container.style.backgroundPosition) {
                container.style.backgroundPosition = 'center';
            }
            container.style.backgroundRepeat = 'no-repeat';
            
            // Force initial background-size for animation (override Webflow)
            container.style.backgroundSize = '110%';
            
            // Don't modify child element styles - let Webflow handle positioning
        } else {
            console.warn(`No image found for world: ${world}`);
            container.style.backgroundColor = '#f0f0f0';
        }
    }

    /**
     * Refresh new recording indicators for all LMID elements
     * This can be called after new recordings are added to update the counts
     */
    async function refreshNewRecordingIndicators() {
        const lmidElements = document.querySelectorAll('[data-lmid]');
        const lmids = Array.from(lmidElements).map(el => el.getAttribute('data-lmid')).filter(Boolean);
        
        if (lmids.length > 0) {
            await batchLoadAllRecordingData(lmids);
        }
    }

    // Make functions available globally
    window.LittleMicrophones = window.LittleMicrophones || {};
    window.LittleMicrophones.refreshNewRecordingIndicators = refreshNewRecordingIndicators;
    window.LittleMicrophones.markLmidWorldVisited = markLmidWorldVisited;
    window.LittleMicrophones.markLmidRadioPlayed = markLmidRadioPlayed;

    // Test function for Memberstack API debugging
    window.testMemberstackAPI = async function() {
        try {
            if (!window.LM_AUTH_SYSTEM) {
                console.error("Auth system not initialized");
                return;
            }
            
            const authResult = await window.LM_AUTH_SYSTEM.initialize();
            
            if (!authResult.authenticated) {
                console.error("Not logged in");
                return;
            }
            
            const memberData = await window.LM_AUTH_SYSTEM.memberData.getMemberForLMIDOperation();
            console.log(`Testing Memberstack API for member: ${memberData.memberId}`);
            
            const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/test-memberstack`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId: memberData.memberId })
            });
            
            const result = await response.json();
            console.log('Test result:', result);
            
        } catch (error) {
            console.error('Test failed:', error);
        }
    };
})();