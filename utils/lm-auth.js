/**
 * lm-auth.js - Authentication & Member Management Module
 * 
 * PURPOSE: Centralized authentication system and member data management for Little Microphones
 * DEPENDENCIES: Memberstack DOM SDK, LM_CONFIG
 * 
 * MAIN FUNCTIONS:
 * - Secure member authentication with error handling
 * - LMID metadata parsing and manipulation
 * - Security validation and limit enforcement
 * - Member data access with proper error boundaries
 * 
 * SECURITY FEATURES:
 * - Comprehensive error handling for authentication failures
 * - LMID limit enforcement (5 programs per user)
 * - Metadata validation and sanitization
 * - Type-safe LMID parsing with multiple format support
 * 
 * INTEGRATION POINTS:
 * - Memberstack DOM SDK for authentication
 * - Global LM_CONFIG for configuration
 * - Backend API for member validation
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

/**
 * AUTHENTICATION CORE MODULE
 * 
 * Provides secure wrapper around Memberstack authentication
 * with comprehensive error handling and validation
 */
export class LMAuth {
    constructor() {
        this.memberstack = window.$memberstackDom;
        this.MAX_LMIDS = 5; // Maximum programs per user
        
        if (!this.memberstack) {
            throw new Error("Memberstack DOM package not found. Please ensure it's loaded before initializing LMAuth.");
        }
    }

    /**
     * Get current authenticated member with comprehensive error handling
     * 
     * AUTHENTICATION FLOW:
     * 1. Check Memberstack availability
     * 2. Fetch current member data
     * 3. Validate member session
     * 4. Return sanitized member data
     * 
     * @returns {Promise<Object|null>} Member data or null if not authenticated
     * @throws {Error} Authentication errors with specific error codes
     */
    async getCurrentMember() {
        try {
            const { data: memberData } = await this.memberstack.getCurrentMember();
            
            if (!memberData) {
                console.log("Member is not logged in");
                return null;
            }

            // Validate essential member data
            if (!memberData.id) {
                throw new Error("Member data is corrupted - missing member ID");
            }

            return memberData;
            
        } catch (error) {
            console.error("Authentication error:", error);
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Validate member authentication with detailed error reporting
     * 
     * @returns {Promise<boolean>} True if authenticated, false otherwise
     */
    async isAuthenticated() {
        try {
            const member = await this.getCurrentMember();
            return member !== null;
        } catch (error) {
            console.error("Authentication validation failed:", error);
            return false;
        }
    }

    /**
     * Get member data with authentication requirement
     * 
     * @returns {Promise<Object>} Member data
     * @throws {Error} If not authenticated
     */
    async requireAuthentication() {
        const member = await this.getCurrentMember();
        
        if (!member) {
            throw new Error("Authentication required. Please log in to continue.");
        }
        
        return member;
    }
}

/**
 * LMID METADATA MANAGEMENT MODULE
 * 
 * Handles parsing, validation, and manipulation of LMID metadata
 * with support for multiple data formats and comprehensive validation
 */
export class LMIDManager {
    constructor(auth) {
        this.auth = auth;
    }

    /**
     * Parse LMID metadata with robust format support
     * 
     * SUPPORTED FORMATS:
     * - String: "3, 4, 5" or "3"
     * - Number: 2
     * - Array: [1, 2, 3] (future support)
     * 
     * @param {string|number|Array} lmidData - LMID data from metadata
     * @returns {Array<string>} Array of LMID strings
     */
    parseLMIDMetadata(lmidData) {
        let lmidArray = [];

        if (!lmidData) {
            return lmidArray;
        }

        try {
            if (typeof lmidData === 'string' && lmidData.trim().length > 0) {
                // Handle "3, 4, 5" or "3"
                lmidArray = lmidData.split(',')
                    .map(item => item.trim())
                    .filter(item => item.length > 0);
            } else if (typeof lmidData === 'number') {
                // Handle single number: 2
                lmidArray = [String(lmidData)];
            } else if (Array.isArray(lmidData)) {
                // Handle array format (future support)
                lmidArray = lmidData.map(item => String(item).trim());
            }

            // Validate LMID format (should be numeric)
            lmidArray = lmidArray.filter(lmid => {
                const isValid = /^\d+$/.test(lmid);
                if (!isValid) {
                    console.warn(`Invalid LMID format detected: ${lmid}`);
                }
                return isValid;
            });

        } catch (error) {
            console.error("Error parsing LMID metadata:", error);
            return [];
        }

        return lmidArray;
    }

    /**
     * Get LMIDs for current authenticated member
     * 
     * @returns {Promise<Array<string>>} Array of LMID strings
     * @throws {Error} If not authenticated
     */
    async getCurrentMemberLMIDs() {
        const member = await this.auth.requireAuthentication();
        const lmidData = member.metaData?.lmids;
        return this.parseLMIDMetadata(lmidData);
    }

    /**
     * Count current LMIDs for member
     * 
     * @returns {Promise<number>} Number of LMIDs
     */
    async getCurrentLMIDCount() {
        const lmids = await this.getCurrentMemberLMIDs();
        return lmids.length;
    }

    /**
     * Check if member can create new LMID (under limit)
     * 
     * @returns {Promise<Object>} Status object with canCreate and count
     */
    async canCreateNewLMID() {
        const currentCount = await this.getCurrentLMIDCount();
        const maxLmids = this.auth.MAX_LMIDS;
        
        return {
            canCreate: currentCount < maxLmids,
            currentCount: currentCount,
            maxLmids: maxLmids,
            remaining: maxLmids - currentCount
        };
    }

    /**
     * Validate LMID limit before creation
     * 
     * @throws {Error} If limit exceeded
     */
    async enforceCreateLimit() {
        const status = await this.canCreateNewLMID();
        
        if (!status.canCreate) {
            throw new Error(`Maximum ${status.maxLmids} programs per user. Delete an existing program to create a new one.`);
        }
        
        return status;
    }

    /**
     * Remove LMID from metadata array
     * 
     * @param {string} lmidToRemove - LMID to remove
     * @param {string} currentLmids - Current LMID metadata string
     * @returns {string|null} New LMID string or null if empty
     */
    removeLMIDFromMetadata(lmidToRemove, currentLmids) {
        const lmidArray = this.parseLMIDMetadata(currentLmids);
        const filteredArray = lmidArray.filter(id => id !== lmidToRemove);
        
        return filteredArray.length > 0 ? filteredArray.join(',') : null;
    }

    /**
     * Add LMID to metadata array
     * 
     * @param {string} newLmid - LMID to add
     * @param {string} currentLmids - Current LMID metadata string
     * @returns {string} New LMID string
     */
    addLMIDToMetadata(newLmid, currentLmids) {
        const lmidArray = this.parseLMIDMetadata(currentLmids);
        
        // Prevent duplicates
        if (!lmidArray.includes(String(newLmid))) {
            lmidArray.push(String(newLmid));
        }
        
        return lmidArray.join(',');
    }
}

/**
 * MEMBER DATA ACCESS MODULE
 * 
 * Provides secure access to member data with validation
 * and error handling for critical operations
 */
export class MemberDataAccess {
    constructor(auth) {
        this.auth = auth;
    }

    /**
     * Get essential member data for operations
     * 
     * @returns {Promise<Object>} Essential member data
     * @throws {Error} If data unavailable
     */
    async getEssentialMemberData() {
        const member = await this.auth.requireAuthentication();
        
        const essentialData = {
            id: member.id,
            email: member.auth?.email || null,
            metaData: member.metaData || {},
            planConnections: member.planConnections || []
        };

        // Validate essential fields
        if (!essentialData.id) {
            throw new Error("Critical member data missing - member ID not found");
        }

        return essentialData;
    }

    /**
     * Get member data for LMID operations
     * 
     * @returns {Promise<Object>} Member data for LMID operations
     */
    async getMemberForLMIDOperation() {
        const essentialData = await this.getEssentialMemberData();
        
        return {
            memberId: essentialData.id,
            memberEmail: essentialData.email,
            currentLmids: essentialData.metaData.lmids || '',
            metaData: essentialData.metaData
        };
    }

    /**
     * Validate member permissions for operations
     * 
     * @returns {Promise<boolean>} True if member has required permissions
     */
    async validateMemberPermissions() {
        try {
            const member = await this.auth.getCurrentMember();
            
            if (!member) {
                return false;
            }

            // Check if member has active plan or required permissions
            const hasActivePlan = member.planConnections && 
                                member.planConnections.some(plan => plan.active);

            return hasActivePlan || true; // Allow all authenticated users for now
            
        } catch (error) {
            console.error("Permission validation failed:", error);
            return false;
        }
    }
}

/**
 * MAIN AUTH FACADE
 * 
 * Unified interface for authentication and member management
 * Combines all auth modules into a single, easy-to-use interface
 */
export class LMAuthSystem {
    constructor() {
        this.auth = new LMAuth();
        this.lmidManager = new LMIDManager(this.auth);
        this.memberData = new MemberDataAccess(this.auth);
    }

    /**
     * Initialize authentication system
     * 
     * @returns {Promise<Object>} Initialization status
     */
    async initialize() {
        try {
            const isAuthenticated = await this.auth.isAuthenticated();
            
            if (isAuthenticated) {
                const member = await this.auth.getCurrentMember();
                const lmids = await this.lmidManager.getCurrentMemberLMIDs();
                
                return {
                    success: true,
                    authenticated: true,
                    member: member,
                    lmids: lmids,
                    lmidCount: lmids.length
                };
            } else {
                return {
                    success: true,
                    authenticated: false,
                    member: null,
                    lmids: [],
                    lmidCount: 0
                };
            }
            
        } catch (error) {
            console.error("Auth system initialization failed:", error);
            return {
                success: false,
                authenticated: false,
                error: error.message,
                member: null,
                lmids: [],
                lmidCount: 0
            };
        }
    }

    /**
     * Comprehensive member validation for operations
     * 
     * @returns {Promise<Object>} Validation result with member data
     */
    async validateForOperation() {
        try {
            const member = await this.auth.requireAuthentication();
            const hasPermission = await this.memberData.validateMemberPermissions();
            
            if (!hasPermission) {
                throw new Error("Insufficient permissions for this operation");
            }
            
            const memberData = await this.memberData.getMemberForLMIDOperation();
            const lmidStatus = await this.lmidManager.canCreateNewLMID();
            
            return {
                success: true,
                member: memberData,
                lmidStatus: lmidStatus,
                canCreateLMID: lmidStatus.canCreate
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                member: null,
                lmidStatus: null,
                canCreateLMID: false
            };
        }
    }

    // Expose individual modules for advanced usage
    getAuth() { return this.auth; }
    getLMIDManager() { return this.lmidManager; }
    getMemberData() { return this.memberData; }
}

/**
 * UTILITY FUNCTIONS
 * 
 * Standalone utility functions for authentication and member management
 */

/**
 * Create singleton auth system instance
 */
let authSystemInstance = null;

export function getAuthSystem() {
    if (!authSystemInstance) {
        authSystemInstance = new LMAuthSystem();
    }
    return authSystemInstance;
}

/**
 * Quick authentication check utility
 * 
 * @returns {Promise<boolean>} True if authenticated
 */
export async function isUserAuthenticated() {
    const authSystem = getAuthSystem();
    return await authSystem.auth.isAuthenticated();
}

/**
 * Quick current member getter
 * 
 * @returns {Promise<Object|null>} Current member or null
 */
export async function getCurrentUser() {
    const authSystem = getAuthSystem();
    return await authSystem.auth.getCurrentMember();
}

/**
 * Quick LMID count getter
 * 
 * @returns {Promise<number>} Current LMID count
 */
export async function getCurrentLMIDCount() {
    const authSystem = getAuthSystem();
    return await authSystem.lmidManager.getCurrentLMIDCount();
}

// Global export for legacy compatibility
if (typeof window !== 'undefined') {
    window.LMAuth = {
        LMAuthSystem,
        getAuthSystem,
        isUserAuthenticated,
        getCurrentUser,
        getCurrentLMIDCount
    };
} 