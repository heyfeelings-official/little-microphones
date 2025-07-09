# Code Comments Guidelines

## Production-Ready Comment Standards

### 📝 Comment Types & Usage

#### 1. **File Headers** (REQUIRED)
```javascript
/**
 * filename.js - Brief Description
 * 
 * PURPOSE: Main purpose of this file
 * DEPENDENCIES: Key dependencies (if any)
 * 
 * @version 4.7.0
 * @since January 2025
 */
```

#### 2. **Function Documentation** (REQUIRED for public functions)
```javascript
/**
 * Brief description of what the function does
 * 
 * @param {string} paramName - Description of parameter
 * @param {Object} options - Configuration object
 * @param {boolean} options.flag - Description of flag
 * @returns {Promise<Object>} Description of return value
 * @throws {Error} When and why errors are thrown
 * 
 * @example
 * const result = await functionName('value', { flag: true });
 */
```

#### 3. **Complex Logic Comments** (AS NEEDED)
```javascript
// Calculate weighted average with bias correction
// Formula: (sum(values * weights) / sum(weights)) * bias
const weightedAvg = values.reduce((sum, val, i) => 
    sum + (val * weights[i]), 0) / totalWeight * bias;
```

#### 4. **TODO Comments** (SPARINGLY)
```javascript
// TODO: Implement retry logic for network failures
// FIXME: Handle edge case when array is empty
// NOTE: This assumes data is already validated
```

### ❌ REMOVE These Comment Patterns

#### 1. **Obvious Comments**
```javascript
// BAD: States the obvious
let count = 0; // Initialize count to 0
count++; // Increment count

// GOOD: Explains why
let retryCount = 0; // Track attempts for exponential backoff
```

#### 2. **Commented-Out Code**
```javascript
// REMOVE ALL:
// function oldImplementation() {
//     return 'deprecated';
// }
// console.log('debug');
```

#### 3. **Redundant Function Comments**
```javascript
// BAD: Repeats function name
/**
 * Gets the user name
 */
function getUserName() { }

// GOOD: Adds value
/**
 * Retrieves user's display name, falling back to email if not set
 */
function getUserName() { }
```

#### 4. **Personal Notes**
```javascript
// REMOVE:
// TODO: Ask John about this
// NOTE: I think this might break
// HACK: Quick fix for demo
```

### ✅ KEEP These Comment Patterns

#### 1. **Business Logic Explanations**
```javascript
// ShareIDs are generated per world to allow granular access control
// Parents can share specific worlds without exposing entire LMID
```

#### 2. **Algorithm Explanations**
```javascript
// Use binary search for O(log n) lookup time
// Array is pre-sorted by timestamp in ascending order
```

#### 3. **API Contract Documentation**
```javascript
/**
 * Expected request format:
 * {
 *   world: string,      // World identifier (e.g., 'spookyland')
 *   lmid: string,       // Little Microphone ID
 *   audioSegments: []   // Array of audio segment objects
 * }
 */
```

#### 4. **Security/Performance Notes**
```javascript
// SECURITY: Validate LMID ownership before processing
// PERFORMANCE: Cache results for 5 minutes to reduce API calls
```

### 📊 Comment Density Guidelines

#### High-Level Files (Controllers, Main)
- **Comment Density**: 20-30%
- **Focus**: Architecture, flow, integration points
- **Example**: `little-microphones.js`, `radio.js`

#### Business Logic Files
- **Comment Density**: 15-25%
- **Focus**: Rules, algorithms, edge cases
- **Example**: `recording.js`, `combine-audio.js`

#### Utility Files
- **Comment Density**: 10-15%
- **Focus**: Function contracts, usage examples
- **Example**: `audio-utils.js`, `cache-busting.js`

#### Configuration Files
- **Comment Density**: 30-40%
- **Focus**: Options, defaults, environment setup
- **Example**: `config.js`, `vercel.json`

### 🎯 Best Practices

#### 1. **Write Comments for "Why", Not "What"**
```javascript
// BAD: Describes what the code does
// Loop through array and add 1 to each element
arr.map(x => x + 1);

// GOOD: Explains why
// Offset all timestamps by 1ms to ensure proper ordering
// when multiple recordings have identical timestamps
arr.map(timestamp => timestamp + 1);
```

#### 2. **Document Assumptions**
```javascript
// Assumes recordings array is sorted by timestamp
// Assumes all audio files are already uploaded to CDN
function processRecordings(recordings) { }
```

#### 3. **Explain Complex Regular Expressions**
```javascript
// Matches: kids-world_spookyland-lmid_123-question_1-tm_1234567890.mp3
// Groups: [1]=world, [2]=lmid, [3]=questionId, [4]=timestamp
const pattern = /kids-world_([^-]+)-lmid_([^-]+)-question_(\d+)-tm_(\d+)\.mp3/;
```

#### 4. **Document Side Effects**
```javascript
/**
 * Updates user metadata in Memberstack
 * Side effects:
 * - Triggers webhook to Make.com
 * - Invalidates user cache
 * - May cause UI refresh
 */
```

### 🚀 Comment Cleanup Checklist

- [ ] Add file headers to all JS files
- [ ] Document all public functions with JSDoc
- [ ] Remove all commented-out code
- [ ] Remove obvious/redundant comments
- [ ] Add "why" comments for complex logic
- [ ] Document all API contracts
- [ ] Add security/performance notes where relevant
- [ ] Ensure consistent comment style
- [ ] Remove personal TODOs and notes
- [ ] Add examples for complex functions

### 📝 File-Specific Guidelines

#### Frontend Files
- Focus on user interaction flows
- Document Webflow integration points
- Explain event handling logic

#### API Files
- Document request/response formats
- Include error code explanations
- Note rate limits and quotas

#### Utility Files
- Provide usage examples
- Document edge cases
- Explain algorithm choices

#### Configuration Files
- Explain each option's purpose
- Document default values
- Note environment dependencies

---

**Remember**: Good comments explain intentions and decisions, not implementation details. 