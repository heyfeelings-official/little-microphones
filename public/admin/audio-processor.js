// Client-side audio trimming using Web Audio API
// Based on proven solutions from documentation

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
            
            // Encode to WebM
            const blob = await this.encodeToWebM(trimmedBuffer);
            
            console.log('✅ Encoding complete:', blob.size, 'bytes');
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
    
    // Encode audio buffer to WebM using MediaRecorder
    async encodeToWebM(audioBuffer) {
        console.log('🎵 Encoding to WebM using MediaRecorder...');
        
        return new Promise((resolve, reject) => {
            try {
                // Create offline context for rendering
                const offlineContext = new OfflineAudioContext(
                    audioBuffer.numberOfChannels,
                    audioBuffer.length,
                    audioBuffer.sampleRate
                );
                
                // Create buffer source
                const source = offlineContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(offlineContext.destination);
                source.start(0);
                
                // Render audio
                offlineContext.startRendering().then(renderedBuffer => {
                    // Create a media stream from the rendered buffer
                    const audioContext = new AudioContext();
                    const streamDestination = audioContext.createMediaStreamDestination();
                    const streamSource = audioContext.createBufferSource();
                    streamSource.buffer = renderedBuffer;
                    streamSource.connect(streamDestination);
                    
                    // Setup MediaRecorder
                    const mediaRecorder = new MediaRecorder(streamDestination.stream, {
                        mimeType: 'audio/webm;codecs=opus',
                        audioBitsPerSecond: 128000 // 128kbps
                    });
                    
                    const chunks = [];
                    
                    mediaRecorder.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            chunks.push(e.data);
                        }
                    };
                    
                    mediaRecorder.onstop = () => {
                        const blob = new Blob(chunks, { type: 'audio/webm' });
                        console.log('✅ WebM encoding complete:', blob.size, 'bytes');
                        resolve(blob);
                    };
                    
                    mediaRecorder.onerror = (error) => {
                        console.error('❌ MediaRecorder error:', error);
                        reject(error);
                    };
                    
                    // Start recording
                    mediaRecorder.start();
                    streamSource.start(0);
                    
                    // Stop recording after audio duration (with small buffer)
                    const durationMs = (renderedBuffer.length / renderedBuffer.sampleRate) * 1000;
                    setTimeout(() => {
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                            streamSource.stop();
                            audioContext.close();
                        }
                    }, durationMs + 100);
                    
                }).catch(reject);
                
            } catch (error) {
                console.error('❌ WebM encoding failed:', error);
                // Fallback to WAV if WebM fails
                console.log('⚠️ Falling back to WAV encoding...');
                const wavBlob = this.encodeToWAV(audioBuffer);
                resolve(wavBlob);
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