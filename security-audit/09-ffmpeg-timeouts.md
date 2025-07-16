# 09. Brak Timeout dla Operacji FFmpeg

## 🔶 POZIOM ZAGROŻENIA: ŚREDNIE

### Opis Podatności
System nie ma timeoutów dla operacji FFmpeg, co może prowadzić do wyczerpania zasobów i DoS attacks.

### Dotknięte Pliki
- `api/combine-audio.js` (brak timeoutów FFmpeg)
- `vercel.json` (tylko function timeout)

### Rekomendowana Naprawa (Prosta - dla startupu)

#### Krok 1: Dodaj timeout wrapper do `api/combine-audio.js`

**ZNAJDŹ tę funkcję:**
```javascript
async function combineAnswersWithBackground(answerPaths, backgroundPath, outputPath) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        
        // ... existing FFmpeg code ...
        
        command
            .complexFilter(filters)
            .on('end', () => {
                console.log('✅ Answers combined with background');
                resolve();
            })
            .on('error', reject)
            .save(outputPath);
    });
}
```

**ZAMIEŃ NA:**
```javascript
async function combineAnswersWithBackground(answerPaths, backgroundPath, outputPath) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        
        // Timeout dla FFmpeg operacji (30 sekund)
        const timeoutId = setTimeout(() => {
            try {
                command.kill('SIGKILL');
            } catch (error) {
                console.warn('Error killing FFmpeg process:', error);
            }
            reject(new Error('FFmpeg operation timed out after 30 seconds'));
        }, 30000);
        
        // ... existing FFmpeg code ...
        
        command
            .complexFilter(filters)
            .on('end', () => {
                clearTimeout(timeoutId);
                console.log('✅ Answers combined with background');
                resolve();
            })
            .on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            })
            .save(outputPath);
    });
}
```

#### Krok 2: Dodaj timeout dla download operations

**ZNAJDŹ funkcje downloadFile:**
```javascript
function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        const request = protocol.get(url, (response) => {
            // ... existing download code ...
        });
        
        request.on('error', reject);
    });
}
```

**ZAMIEŃ NA:**
```javascript
function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        // Timeout dla downloadu (15 sekund)
        const timeoutId = setTimeout(() => {
            reject(new Error('Download timed out after 15 seconds'));
        }, 15000);
        
        const request = protocol.get(url, { timeout: 10000 }, (response) => {
            if (response.statusCode !== 200) {
                clearTimeout(timeoutId);
                reject(new Error(`Download failed with status: ${response.statusCode}`));
                return;
            }
            
            const fileStream = createWriteStream(filePath);
            response.pipe(fileStream);
            
            fileStream.on('finish', () => {
                clearTimeout(timeoutId);
                resolve();
            });
            
            fileStream.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
        
        request.on('timeout', () => {
            clearTimeout(timeoutId);
            request.destroy();
            reject(new Error('Download request timed out'));
        });
        
        request.on('error', (error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });
}
```

#### Krok 3: Dodaj global timeout wrapper dla całego procesu

**Na początku main handler function w `api/combine-audio.js`:**
```javascript
export default async function handler(req, res) {
    // Global timeout dla całego procesu (50 sekund)
    const globalTimeoutId = setTimeout(() => {
        console.error('❌ Global timeout reached for combine-audio operation');
        if (!res.headersSent) {
            res.status(408).json({ 
                error: 'Request timeout', 
                message: 'Audio processing took too long' 
            });
        }
    }, 50000);
    
    try {
        // ... existing handler code ...
        
        // Clear timeout on success
        clearTimeout(globalTimeoutId);
        
        res.json({
            success: true,
            message: 'Audio combined successfully',
            radioUrl: radioUrl
        });
    } catch (error) {
        clearTimeout(globalTimeoutId);
        
        console.error('❌ Error in combine-audio:', error);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Audio processing failed',
                message: error.message 
            });
        }
    }
}
```

#### Krok 4: Dodaj monitoring i resource cleanup

**Dodaj na końcu `api/combine-audio.js`:**
```javascript
// Cleanup function dla plików tymczasowych
function cleanupTempFiles(filePaths) {
    filePaths.forEach(filePath => {
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log(`🧹 Cleaned up temp file: ${filePath}`);
            } catch (error) {
                console.warn(`⚠️ Failed to cleanup file ${filePath}:`, error);
            }
        }
    });
}

// Używaj w main handler:
// Po zakończeniu operacji (success lub error):
cleanupTempFiles([...answerPaths, backgroundPath, outputPath]);
```

### Dlaczego ta rekomendacja?
- **Simple implementation** - używa basic setTimeout/clearTimeout
- **Multiple timeouts** - różne timeouty dla różnych operacji
- **Resource cleanup** - automatyczne czyszczenie plików
- **Graceful degradation** - informuje użytkownika o timeout
- **Process safety** - zabija hung processes

### Harmonogram (1 godzina)
1. Dodaj timeout do FFmpeg operations (20 min)
2. Dodaj timeout do download operations (15 min)
3. Dodaj global timeout wrapper (15 min)
4. Dodaj cleanup funkcje (10 min) 