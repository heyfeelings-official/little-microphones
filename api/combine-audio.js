export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const startTime = Date.now();
    let tempFiles = []; // Track temp files for cleanup

    try {
        const { lmid, world, recordings } = req.body;

        // Validation
        if (!lmid || !world || !recordings) {
            return res.status(400).json({ 
                error: 'Missing required fields: lmid, world, and recordings' 
            });
        }

        // Validate recordings structure
        if (typeof recordings !== 'object' || Object.keys(recordings).length === 0) {
            return res.status(400).json({ 
                error: 'Invalid recordings format. Expected object with question keys.' 
            });
        }

        // Check environment variables
        if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE || !process.env.BUNNY_CDN_URL) {
            console.error('Missing Bunny.net configuration');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        console.log(`Starting radio program generation for LMID ${lmid}, World ${world}`);
        console.log(`Recordings structure:`, Object.keys(recordings).map(q => `${q}: ${recordings[q].length} files`));

        // Initialize required modules
        const ffmpeg = require('fluent-ffmpeg');
        const fs = require('fs').promises;
        const path = require('path');
        const os = require('os');

        // Create temp directory
        const tempDir = path.join(os.tmpdir(), `radio-${lmid}-${world}-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        // Audio configuration optimized for classroom recordings
        const audioConfig = getClassroomAudioConfig();

        // Step 1: Download static audio files
        console.log('Downloading static audio files...');
        const staticFiles = await downloadStaticFiles(world, tempDir);
        tempFiles.push(...staticFiles);

        // Step 2: Process each question block
        console.log('Processing question blocks...');
        const questionBlocks = [];
        
        for (let questionNum = 1; questionNum <= 6; questionNum++) {
            const questionKey = `Q${questionNum}`;
            const questionRecordings = recordings[questionKey] || [];
            
            if (questionRecordings.length > 0) {
                console.log(`Processing ${questionKey} with ${questionRecordings.length} recordings...`);
                
                const questionBlock = await processQuestionBlock(
                    questionNum, 
                    world, 
                    lmid, 
                    questionRecordings, 
                    tempDir, 
                    audioConfig
                );
                
                if (questionBlock) {
                    questionBlocks.push(questionBlock);
                    tempFiles.push(questionBlock);
                }
            } else {
                console.log(`Skipping ${questionKey} - no recordings found`);
            }
        }

        if (questionBlocks.length === 0) {
            return res.status(400).json({ 
                error: 'No valid recordings found to process' 
            });
        }

        // Step 3: Combine everything into final radio program
        console.log('Creating final radio program...');
        const finalAudioPath = await createFinalRadioProgram(
            staticFiles,
            questionBlocks,
            tempDir,
            audioConfig
        );
        tempFiles.push(finalAudioPath);

        // Step 4: Upload to Bunny.net
        console.log('Uploading final radio program...');
        const uploadResult = await uploadFinalProgram(finalAudioPath, lmid, world);

        // Step 5: Cleanup temp files
        await cleanupTempFiles([tempDir, ...tempFiles]);

        const processingTime = Date.now() - startTime;
        console.log(`Radio program generation completed in ${processingTime}ms`);

        res.json({
            success: true,
            url: uploadResult.url,
            processingTime: processingTime,
            questionCount: questionBlocks.length,
            totalRecordings: Object.values(recordings).flat().length
        });

    } catch (error) {
        console.error('Radio program generation error:', error);
        
        // Cleanup on error
        if (tempFiles.length > 0) {
            cleanupTempFiles(tempFiles).catch(e => 
                console.error('Cleanup error:', e)
            );
        }

        res.status(500).json({
            success: false,
            error: 'Radio program generation failed',
            details: error.message
        });
    }
}

// Audio configuration optimized for classroom recordings
function getClassroomAudioConfig() {
    return {
        volumes: {
            backgroundMusic: 0.15,
            introOutro: 0.75,
            questions: 0.85,
            userAnswers: 1.0,
            masterVolume: 0.95
        },
        enhancement: {
            noiseReductionLevel: 0.7,
            highpassFreq: 120,
            lowpassFreq: 8000,
            compressorThreshold: -25,
            compressorRatio: 4.0,
            gateThreshold: -45
        },
        timing: {
            fadeInDuration: 0.3,
            fadeOutDuration: 0.3,
            silenceBetweenAnswers: 0.5,
            silenceBetweenQuestions: 1.0
        },
        output: {
            sampleRate: 48000,
            bitRate: 256,
            format: 'mp3'
        }
    };
}

// Download static audio files (intro, outro, background music, questions)
async function downloadStaticFiles(world, tempDir) {
    const files = [];
    const baseUrl = `https://${process.env.BUNNY_CDN_URL}`;
    
    try {
        // Download intro, background music, outro
        const staticUrls = {
            intro: `${baseUrl}/audio/other/intro.mp3`,
            monkeys: `${baseUrl}/audio/other/monkeys.mp3`,
            outro: `${baseUrl}/audio/other/outro.mp3`
        };

        // Download question files for this world
        for (let i = 1; i <= 6; i++) {
            staticUrls[`question${i}`] = `${baseUrl}/audio/${world}/${world}-Q${i}.mp3`;
        }

        // Download all files
        for (const [key, url] of Object.entries(staticUrls)) {
            const filePath = path.join(tempDir, `${key}.mp3`);
            await downloadFile(url, filePath);
            files.push(filePath);
        }

        return files;
    } catch (error) {
        console.error('Error downloading static files:', error);
        throw error;
    }
}

// Download a single file from URL
async function downloadFile(url, filePath) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(buffer));
    console.log(`Downloaded: ${path.basename(filePath)}`);
}

// Process a single question block (question + answers + background music)
async function processQuestionBlock(questionNum, world, lmid, recordings, tempDir, config) {
    return new Promise(async (resolve, reject) => {
        try {
            const ffmpeg = require('fluent-ffmpeg');
            
            // Download user recordings for this question
            const recordingFiles = [];
            const baseUrl = `https://${process.env.BUNNY_CDN_URL}`;
            
            for (let i = 0; i < recordings.length; i++) {
                const recordingFilename = recordings[i];
                const recordingUrl = `${baseUrl}/${lmid}/${world}/${recordingFilename}`;
                const localPath = path.join(tempDir, `q${questionNum}_answer${i + 1}.webm`);
                
                try {
                    await downloadFile(recordingUrl, localPath);
                    recordingFiles.push(localPath);
                } catch (error) {
                    console.warn(`Failed to download recording ${recordingFilename}:`, error.message);
                    // Continue with other recordings
                }
            }

            if (recordingFiles.length === 0) {
                console.warn(`No valid recordings for Q${questionNum}`);
                resolve(null);
                return;
            }

            // Step 1: Enhance and concatenate all answers for this question
            const answersPath = path.join(tempDir, `q${questionNum}_combined_answers.mp3`);
            
            let command = ffmpeg();
            
            // Add all recording files as inputs
            recordingFiles.forEach(file => {
                command = command.input(file);
            });

            // Apply classroom audio enhancement and concatenation
            const enhancementFilter = buildClassroomEnhancementFilter(config, recordingFiles.length);
            
            command
                .complexFilter(enhancementFilter)
                .audioFrequency(config.output.sampleRate)
                .audioBitrate(config.output.bitRate)
                .format('mp3')
                .output(answersPath)
                .on('end', async () => {
                    try {
                        // Step 2: Add background music with ducking
                        const answersWithBgPath = path.join(tempDir, `q${questionNum}_answers_with_bg.mp3`);
                        const backgroundPath = path.join(tempDir, 'monkeys.mp3');
                        
                        ffmpeg()
                            .input(answersPath)
                            .input(backgroundPath)
                            .complexFilter([
                                `[1:a]volume=${config.volumes.backgroundMusic}[bg]`,
                                `[0:a][bg]sidechaincompress=threshold=0.003:ratio=0.2:attack=3:release=100[mixed]`
                            ])
                            .map('[mixed]')
                            .format('mp3')
                            .output(answersWithBgPath)
                            .on('end', async () => {
                                try {
                                    // Step 3: Combine question + processed answers
                                    const questionPath = path.join(tempDir, `question${questionNum}.mp3`);
                                    const finalQuestionBlockPath = path.join(tempDir, `complete_q${questionNum}.mp3`);
                                    
                                    ffmpeg()
                                        .input(questionPath)
                                        .input(answersWithBgPath)
                                        .complexFilter([
                                            `[0:a]volume=${config.volumes.questions}[q]`,
                                            `[1:a]volume=${config.volumes.userAnswers}[a]`,
                                            `[q][a]concat=n=2:v=0:a=1[out]`
                                        ])
                                        .map('[out]')
                                        .format('mp3')
                                        .output(finalQuestionBlockPath)
                                        .on('end', () => {
                                            console.log(`Completed processing Q${questionNum}`);
                                            resolve(finalQuestionBlockPath);
                                        })
                                        .on('error', reject)
                                        .run();
                                } catch (error) {
                                    reject(error);
                                }
                            })
                            .on('error', reject)
                            .run();
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', reject)
                .run();

        } catch (error) {
            reject(error);
        }
    });
}

// Build FFmpeg filter for classroom audio enhancement
function buildClassroomEnhancementFilter(config, inputCount) {
    const filters = [];
    
    // For each input, apply classroom enhancement
    for (let i = 0; i < inputCount; i++) {
        const enhanceFilter = [
            `[${i}:a]`,
            `highpass=f=${config.enhancement.highpassFreq}`,
            `lowpass=f=${config.enhancement.lowpassFreq}`,
            `anlmdn=s=${config.enhancement.noiseReductionLevel}:p=0.002`,
            `agate=level_in=1:threshold=${config.enhancement.gateThreshold / 100}:ratio=10:attack=1:release=500`,
            `acompressor=threshold=${config.enhancement.compressorThreshold / 100}:ratio=${config.enhancement.compressorRatio}:attack=5:release=150`,
            `equalizer=f=150:width_type=q:width=1.5:g=4`,
            `equalizer=f=1000:width_type=q:width=2.0:g=3`,
            `equalizer=f=2500:width_type=q:width=1.5:g=2.5`,
            `volume=${config.volumes.userAnswers}[enhanced${i}]`
        ].join(',');
        
        filters.push(enhanceFilter);
    }
    
    // Concatenate all enhanced inputs
    const concatInputs = Array.from({length: inputCount}, (_, i) => `[enhanced${i}]`).join('');
    filters.push(`${concatInputs}concat=n=${inputCount}:v=0:a=1[out]`);
    
    return filters;
}

// Create final radio program by combining all parts
async function createFinalRadioProgram(staticFiles, questionBlocks, tempDir, config) {
    return new Promise((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg');
        const finalPath = path.join(tempDir, 'final_radio_program.mp3');
        
        let command = ffmpeg();
        
        // Add intro
        const introPath = staticFiles.find(f => f.includes('intro.mp3'));
        if (introPath) {
            command = command.input(introPath);
        }
        
        // Add all question blocks
        questionBlocks.forEach(block => {
            command = command.input(block);
        });
        
        // Add outro
        const outroPath = staticFiles.find(f => f.includes('outro.mp3'));
        if (outroPath) {
            command = command.input(outroPath);
        }
        
        // Build concatenation filter
        const totalInputs = (introPath ? 1 : 0) + questionBlocks.length + (outroPath ? 1 : 0);
        const concatFilter = `concat=n=${totalInputs}:v=0:a=1[final]`;
        
        command
            .complexFilter([concatFilter])
            .map('[final]')
            .audioFrequency(config.output.sampleRate)
            .audioBitrate(config.output.bitRate)
            .format('mp3')
            .output(finalPath)
            .on('end', () => {
                console.log('Final radio program created successfully');
                resolve(finalPath);
            })
            .on('error', reject)
            .run();
    });
}

// Upload final program to Bunny.net
async function uploadFinalProgram(filePath, lmid, world) {
    const fs = require('fs').promises;
    
    try {
        const audioBuffer = await fs.readFile(filePath);
        const filename = `little-microphones-full-${lmid}-${world}.mp3`;
        const uploadPath = `${lmid}/${world}/${filename}`;
        const uploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${uploadPath}`;
        
        console.log(`Uploading final program: ${filename} (${audioBuffer.length} bytes)`);
        
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'audio/mpeg'
            },
            body: audioBuffer
        });

        if (response.ok) {
            const cdnUrl = `https://${process.env.BUNNY_CDN_URL}/${uploadPath}`;
            console.log(`Successfully uploaded final program: ${cdnUrl}`);
            
            return {
                success: true,
                url: cdnUrl,
                filename: filename,
                size: audioBuffer.length
            };
        } else {
            const errorText = await response.text();
            console.error(`Upload failed: ${response.status} - ${errorText}`);
            throw new Error(`Upload failed: ${response.status}`);
        }
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// Cleanup temporary files
async function cleanupTempFiles(files) {
    const fs = require('fs').promises;
    
    for (const file of files) {
        try {
            const path = require('path');
            await fs.rm(file, { recursive: true, force: true });
            console.log(`Cleaned up: ${path.basename(file)}`);
        } catch (error) {
            console.warn(`Failed to cleanup ${file}:`, error.message);
        }
    }
} 