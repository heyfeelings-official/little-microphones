/**
 * program-container-example.js
 * Example usage of ProgramContainer for Webflow integration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Add a div with ID "program-container" to your Webflow page
 * 2. Include program-container-styles.css in Custom Code
 * 3. Include radio-player.js (modified version) in Custom Code
 * 4. Use this example code to control the container states
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎵 Program page initializing...');
    
    // Initialize the program container
    const container = window.ProgramContainer.initialize('program-container');
    
    if (!container) {
        console.error('❌ Failed to initialize program container');
        return;
    }
    
    // Example flow - simulate real radio program loading
    simulateRadioProgramFlow();
});

/**
 * Simulate the complete radio program flow
 */
async function simulateRadioProgramFlow() {
    const container = document.getElementById('program-container');
    
    try {
        // PHASE 1: Loading state with fun messages
        console.log('📡 Starting loading phase...');
        
        const loadingMessages = [
            'Loading your radio program...',
            'Connecting to the studio...',
            'Tuning the frequencies...',
            'Preparing the magic...',
            'Almost ready...'
        ];
        
        for (let i = 0; i < loadingMessages.length; i++) {
            window.ProgramContainer.updateLoadingMessage(loadingMessages[i]);
            await sleep(1000); // Wait 1 second between messages
        }
        
        // Update world info
        window.ProgramContainer.updateWorldName('Spookyland');
        window.ProgramContainer.updateMetaInfo('John Teacher & The Kids', 'from Elementary X');
        
        // PHASE 2: Check if we need to generate or can play existing
        const needsGeneration = Math.random() > 0.5; // Simulate 50% chance
        
        if (needsGeneration) {
            // PHASE 2A: Generation flow
            console.log('⚙️ Starting generation phase...');
            
            window.ProgramContainer.showGenerating(container, 'Preparing audio segments...', 0);
            
            const generationSteps = [
                { message: 'Collecting recordings...', progress: 10 },
                { message: 'Processing audio tracks...', progress: 25 },
                { message: 'Adding background music...', progress: 45 },
                { message: 'Mixing everything together...', progress: 70 },
                { message: 'Adding final touches...', progress: 90 },
                { message: 'Complete!', progress: 100 }
            ];
            
            for (const step of generationSteps) {
                window.ProgramContainer.updateGeneratingProgress(step.message, step.progress);
                await sleep(1500); // Wait 1.5 seconds between steps
            }
            
            await sleep(1000); // Final pause
        }
        
        // PHASE 3: Show player with audio
        console.log('🎵 Starting playback phase...');
        
        // Example audio URL (replace with your actual audio)
        const audioUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
        
        const radioData = {
            world: 'spookyland',
            teacher: 'John Teacher & The Kids',
            school: 'from Elementary X'
        };
        
        window.ProgramContainer.showPlayer(container, audioUrl, radioData);
        
        console.log('✅ Program flow completed successfully');
        
    } catch (error) {
        console.error('❌ Program flow failed:', error);
        
        // Show error state
        container.innerHTML = `
            <div class="program-state program-error">
                <div class="program-world-header">
                    <h2 class="program-world-title">Little Microphones</h2>
                    <h1 class="program-world-name">Error</h1>
                </div>
                <div class="program-error">
                    Failed to load radio program. Please try refreshing the page.
                </div>
            </div>
        `;
    }
}

/**
 * Example: How to handle real ShareID from URL
 */
function handleRealRadioProgram() {
    // Extract ShareID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('ID');
    
    if (!shareId) {
        console.error('No ShareID found in URL');
        return;
    }
    
    console.log(`📻 Loading radio program for ShareID: ${shareId}`);
    
    const container = document.getElementById('program-container');
    
    // Start with loading state
    window.ProgramContainer.showLoading(container, 'Loading radio program...');
    
    // Call your API to get radio data
    fetchRadioData(shareId)
        .then(radioData => {
            if (radioData.needsNewProgram) {
                // Show generating state
                window.ProgramContainer.showGenerating(container, 'Generating new program...', 0);
                
                // Generate new program
                return generateNewProgram(radioData);
            } else {
                // Show existing program
                return { audioUrl: radioData.lastManifest.programUrl, radioData };
            }
        })
        .then(result => {
            // Show player
            window.ProgramContainer.showPlayer(container, result.audioUrl, result.radioData);
        })
        .catch(error => {
            console.error('Failed to load radio program:', error);
            // Show error state
        });
}

/**
 * Example API calls (replace with your actual implementations)
 */
async function fetchRadioData(shareId) {
    // Replace with your actual API call
    const response = await fetch(`/api/get-radio-data?shareId=${shareId}`);
    return await response.json();
}

async function generateNewProgram(radioData) {
    // Replace with your actual generation logic
    const response = await fetch('/api/combine-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(radioData)
    });
    
    const result = await response.json();
    return { audioUrl: result.url, radioData };
}

/**
 * Utility function for delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Example: Manual state control for testing
 */
function setupTestControls() {
    // Add test buttons to page (for development only)
    const testControls = document.createElement('div');
    testControls.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 10000; background: white; padding: 10px; border-radius: 5px;';
    testControls.innerHTML = `
        <button onclick="testLoadingState()">Loading</button>
        <button onclick="testGeneratingState()">Generating</button>
        <button onclick="testPlayerState()">Player</button>
    `;
    document.body.appendChild(testControls);
}

function testLoadingState() {
    const container = document.getElementById('program-container');
    window.ProgramContainer.showLoading(container, 'Loading test...');
}

function testGeneratingState() {
    const container = document.getElementById('program-container');
    window.ProgramContainer.showGenerating(container, 'Generating test...', 50);
}

function testPlayerState() {
    const container = document.getElementById('program-container');
    const audioUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
    window.ProgramContainer.showPlayer(container, audioUrl, { world: 'test' });
}

// Uncomment for development testing
// setupTestControls(); 