// Client-side audio trimming using Web Audio API
// Based on proven solutions from documentation
// Now with LAME.js for fast MP3 encoding

class ClientAudioProcessor {
    constructor() {
        this.audioContext = null;
    }
    
    // Initialize audio context
    initContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    // Main trim function
    async trimAudioFile(fileUrl, startTime, endTime) {
        try {
            console.log('🎵 Starting audio trim...', { startTime, endTime });
            
            // Download audio file
            const arrayBuffer = await this.downloadAudio(fileUrl);
            
            // Decode audio data
            this.initContext();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Calculate trim parameters
            const sampleRate = audioBuffer.sampleRate;
            const startSample = Math.floor(startTime * sampleRate);
            const endSample = Math.floor(endTime * sampleRate);
            const trimLength = endSample - startSample;
            
            // Create trimmed buffer
            const trimmedBuffer = this.audioContext.createBuffer(
                audioBuffer.numberOfChannels,
                trimLength,
                sampleRate
            );
            
            // Copy trimmed audio data
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const sourceData = audioBuffer.getChannelData(channel);
                const trimmedData = trimmedBuffer.getChannelData(channel);
                
                for (let i = 0; i < trimLength; i++) {
                    trimmedData[i] = sourceData[startSample + i];
                }
            }
            
            console.log('✂️ Audio trimmed successfully');
            
            // Try MP3 encoding first (fast), fallback to WebM if needed
            let blob;
            try {
                blob = await this.encodeToMP3(trimmedBuffer);
                console.log('✅ MP3 encoding complete:', blob.size, 'bytes');
            } catch (mp3Error) {
                console.warn('⚠️ MP3 encoding failed, falling back to WebM:', mp3Error.message);
                blob = await this.encodeToWebM(trimmedBuffer);
                console.log('✅ WebM fallback complete:', blob.size, 'bytes');
            }
            
            return blob;
            
        } catch (error) {
            console.error('❌ Trim error:', error);
            throw error;
        }
    }
    
    // Download audio file
    async downloadAudio(url) {
        console.log('📥 Downloading audio from:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to download audio: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log('✅ Download complete:', arrayBuffer.byteLength, 'bytes');
        return arrayBuffer;
    }
    
    // Encode audio buffer to WebM - optimized for speed
    async encodeToWebM(audioBuffer) {
        console.log('🎵 Starting fast WebM encoding...');
        const startTime = performance.now();
        
        const durationSeconds = audioBuffer.length / audioBuffer.sampleRate;
        console.log(`⚡ Encoding ${durationSeconds.toFixed(1)}s audio to WebM...`);
        
        return new Promise((resolve, reject) => {
            try {
                // Check for MediaRecorder support first
                if (!window.MediaRecorder || !MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    console.error('❌ WebM with Opus not supported in this browser');
                    reject(new Error('WebM encoding not supported in this browser'));
                    return;
                }
                
                // Timeout for the entire encoding process (5 seconds max)
                const encodingTimeout = setTimeout(() => {
                    console.error('⏰ WebM encoding timeout after 5 seconds');
                    reject(new Error('WebM encoding timeout - process took too long'));
                }, 5000);
                
                // Optimized: Skip offline rendering, use direct stream
                const audioContext = new AudioContext();
                const streamDestination = audioContext.createMediaStreamDestination();
                const streamSource = audioContext.createBufferSource();
                streamSource.buffer = audioBuffer;
                streamSource.connect(streamDestination);
                
                // Setup MediaRecorder with optimized settings for speed
                const mediaRecorder = new MediaRecorder(streamDestination.stream, {
                    mimeType: 'audio/webm;codecs=opus',
                    audioBitsPerSecond: 48000 // Optimized bitrate for speed vs quality
                });
                
                const chunks = [];
                let hasStopped = false;
                
                mediaRecorder.onstart = () => {
                    console.log('⚡ Fast MediaRecorder started.');
                };
                
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };
                
                mediaRecorder.onstop = () => {
                    if (hasStopped) return;
                    hasStopped = true;
                    
                    clearTimeout(encodingTimeout);
                    
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    
                    // Clean up resources
                    streamSource.stop();
                    audioContext.close();
                    
                    const endTime = performance.now();
                    const encodingTime = (endTime - startTime).toFixed(0);
                    
                    if (blob.size === 0) {
                        console.error('❌ WebM encoding resulted in an empty file.');
                        reject(new Error('WebM encoding failed - empty file generated'));
                    } else {
                        console.log(`✅ WebM encoding complete in ${encodingTime}ms:`, blob.size, 'bytes');
                        resolve(blob);
                    }
                };
                
                mediaRecorder.onerror = (error) => {
                    clearTimeout(encodingTimeout);
                    console.error('❌ MediaRecorder error:', error);
                    reject(new Error(`WebM encoding failed: ${error.message || 'Unknown MediaRecorder error'}`));
                };
                
                // Start recording immediately with optimized settings
                mediaRecorder.start(50); // Request data every 50ms for faster processing
                streamSource.start(0);
                
                // Stop recording after audio duration with minimal buffer
                const durationMs = durationSeconds * 1000;
                setTimeout(() => {
                    if (mediaRecorder.state === 'recording') {
                        console.log('⏹️ Stopping MediaRecorder via timeout.');
                        mediaRecorder.stop();
                    }
                }, Math.max(durationMs + 100, 500)); // Minimum 500ms, but add buffer for longer files
                
            } catch (error) {
                console.error('❌ WebM encoding failed:', error);
                reject(new Error(`WebM encoding failed: ${error.message || 'Unknown error'}`));
            }
        });
    }
    
    // Fallback: Encode to WAV format
    encodeToWAV(audioBuffer) {
        console.log('🎵 Encoding to WAV format...');
        
        const length = audioBuffer.length * audioBuffer.numberOfChannels * 2;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, audioBuffer.numberOfChannels, true);
        view.setUint32(24, audioBuffer.sampleRate, true);
        view.setUint32(28, audioBuffer.sampleRate * audioBuffer.numberOfChannels * 2, true);
        view.setUint16(32, audioBuffer.numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length, true);
        
        // Convert float samples to 16-bit PCM
        let offset = 44;
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample * 0x7FFF, true);
                offset += 2;
            }
        }
        
        const blob = new Blob([buffer], { type: 'audio/wav' });
        console.log('✅ WAV encoding complete:', blob.size, 'bytes');
        return blob;
    }
    
    // Fast MP3 encoding using LAME.js
    async encodeToMP3(audioBuffer) {
        console.log('🎵 Encoding to MP3 using LAME.js...');
        const startTime = performance.now();
        
        return new Promise((resolve, reject) => {
            try {
                // Check if LAME.js is available
                if (typeof lamejs === 'undefined') {
                    throw new Error('LAME.js not loaded. Please include lamejs library.');
                }
                
                const sampleRate = audioBuffer.sampleRate;
                const channels = audioBuffer.numberOfChannels;
                const bitRate = 128; // 128 kbps for good quality/speed balance
                
                console.log(`🎛️ MP3 settings: ${channels}ch, ${sampleRate}Hz, ${bitRate}kbps`);
                
                // Initialize LAME encoder
                const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitRate);
                const mp3Data = [];
                
                // Convert float32 samples to int16
                const samples = new Int16Array(audioBuffer.length * channels);
                
                if (channels === 1) {
                    // Mono
                    const channelData = audioBuffer.getChannelData(0);
                    for (let i = 0; i < audioBuffer.length; i++) {
                        samples[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
                    }
                } else {
                    // Stereo
                    const leftChannel = audioBuffer.getChannelData(0);
                    const rightChannel = audioBuffer.getChannelData(1);
                    
                    for (let i = 0; i < audioBuffer.length; i++) {
                        samples[i * 2] = Math.max(-32768, Math.min(32767, leftChannel[i] * 32768));
                        samples[i * 2 + 1] = Math.max(-32768, Math.min(32767, rightChannel[i] * 32768));
                    }
                }
                
                console.log('🔄 Converting samples to MP3...');
                
                // Encode in blocks for better performance
                const blockSize = 1152; // Standard MP3 frame size
                for (let i = 0; i < samples.length; i += blockSize * channels) {
                    const sampleBlock = samples.subarray(i, i + blockSize * channels);
                    const mp3buf = mp3encoder.encodeBuffer(sampleBlock);
                    if (mp3buf.length > 0) {
                        mp3Data.push(mp3buf);
                    }
                }
                
                // Flush remaining data
                const mp3buf = mp3encoder.flush();
                if (mp3buf.length > 0) {
                    mp3Data.push(mp3buf);
                }
                
                // Create blob
                const blob = new Blob(mp3Data, { type: 'audio/mp3' });
                
                const endTime = performance.now();
                const encodingTime = (endTime - startTime).toFixed(0);
                
                console.log(`✅ MP3 encoding complete in ${encodingTime}ms:`, blob.size, 'bytes');
                resolve(blob);
                
            } catch (error) {
                console.error('❌ MP3 encoding failed:', error);
                reject(error);
            }
        });
    }
    
    // Convert blob to base64 for upload
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    // Check if Web Audio API is supported
    isSupported() {
        return !!(window.AudioContext || window.webkitAudioContext) && 
               !!window.MediaRecorder &&
               MediaRecorder.isTypeSupported('audio/webm;codecs=opus');
    }
}

// Export for use in admin-ui.js
window.ClientAudioProcessor = ClientAudioProcessor;