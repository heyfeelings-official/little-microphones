# Console.log Cleanup Guidelines

## Production Console.log Standards

### ✅ KEEP These Console Statements

#### 1. **Critical Errors**
```javascript
console.error('❌ Authentication failed:', error);
console.error('💥 Fatal error:', error.message);
```

#### 2. **Security Warnings**
```javascript
console.warn('⚠️ Unauthorized access attempt');
console.warn('⚠️ Invalid LMID format detected');
```

#### 3. **Important State Changes** (Production)
```javascript
// Only in production builds
if (window.LM_CONFIG?.DEBUG_ENABLED) {
    console.log('✅ User authenticated');
    console.log('🎯 Recording started');
}
```

### ❌ REMOVE These Console Statements

#### 1. **Debug Information**
```javascript
// REMOVE: Development debugging
console.log('Found elements:', elements);
console.log('Current state:', state);
console.log(`Processing ${count} items`);
```

#### 2. **Verbose Progress Updates**
```javascript
// REMOVE: Too detailed for production
console.log('Step 1 complete');
console.log('Entering function X');
console.log('Loop iteration:', i);
```

#### 3. **Temporary Testing**
```javascript
// REMOVE: Test outputs
console.log('TEST:', testValue);
console.log('HERE'); 
console.log('---');
```

### 🔄 CONVERT These Patterns

#### From Development to Production

**Before:**
```javascript
console.log(`🎬 Setting background for world: ${world}, URL: ${backgroundUrl}`);
console.log(`📹 Using config video URL: ${videoUrl}`);
console.log(`✅ Video loaded successfully: ${videoUrl}`);
```

**After:**
```javascript
// Use debug flag
if (window.LM_CONFIG?.DEBUG_ENABLED) {
    console.log(`[Video] Background set for ${world}`);
}

// Or remove entirely if not critical
```

### 📊 Console Categories by File Type

#### Frontend Files (*.js)
- **Keep**: Critical errors, security warnings
- **Remove**: All debug logs, verbose updates
- **Convert**: Important state changes to debug-only

#### API Files (/api/*.js)
- **Keep**: Error responses, critical failures
- **Remove**: Success confirmations, data dumps
- **Convert**: Important operations to structured logging

#### Utility Files (/utils/*.js)
- **Keep**: Nothing (utilities should be silent)
- **Remove**: All console statements
- **Exception**: Error boundaries only

### 🎯 Recommended Console Usage

#### 1. **Use Structured Logging**
```javascript
const log = (level, message, data = null) => {
    if (!window.LM_CONFIG?.DEBUG_ENABLED && level !== 'error') return;
    
    const timestamp = new Date().toISOString();
    const prefix = {
        error: '❌',
        warn: '⚠️',
        info: 'ℹ️',
        success: '✅'
    }[level] || '📝';
    
    console[level] || console.log(`[${timestamp}] ${prefix} ${message}`, data || '');
};
```

#### 2. **Environment-Based Logging**
```javascript
// config.js
window.LM_CONFIG.DEBUG_ENABLED = window.location.hostname.includes('localhost') || 
                                  window.location.hostname.includes('webflow.io');

// Usage
if (window.LM_CONFIG.DEBUG_ENABLED) {
    console.log('[Debug] Operation details');
}
```

#### 3. **Error-Only Production Logs**
```javascript
try {
    // operation
} catch (error) {
    // Always log errors
    console.error('[ModuleName] Operation failed:', {
        error: error.message,
        stack: error.stack,
        context: relevantData
    });
}
```

### 🚀 Cleanup Checklist

- [ ] Remove all `console.log` from production paths
- [ ] Convert critical logs to conditional debug logs
- [ ] Keep only `console.error` for actual errors
- [ ] Remove all data dumps and object logging
- [ ] Add structured logging utility
- [ ] Test with `DEBUG_ENABLED = false`
- [ ] Verify no sensitive data in remaining logs

### 📝 File-Specific Notes

#### radio.js
- Remove: Video loading confirmations
- Keep: Player initialization errors
- Convert: State changes to debug-only

#### recording.js
- Remove: Progress updates, UI logs
- Keep: Recording errors, upload failures
- Convert: Status updates to events

#### API files
- Remove: Success confirmations
- Keep: Database errors, API failures
- Add: Structured error responses

---

**Remember**: Production logs should help diagnose issues, not document normal operation. 