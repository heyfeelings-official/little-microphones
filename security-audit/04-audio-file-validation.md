# 04. Niedostateczna Walidacja Plików Audio

## ⚠️ POZIOM ZAGROŻENIA: WYSOKIE

### Opis Podatności
System nie weryfikuje rzeczywistego typu MIME plików audio, co może prowadzić do uploadowania złośliwych plików.

### Dotknięte Pliki
- `api/upload-audio.js` (linia 119-127)

### Rekomendowana Naprawa (Prosta - dla startupu)

#### Krok 1: Dodaj podstawową walidację rozmiaru i formatu w `api/upload-audio.js`

**Znajdź i zaktualizuj sekcję walidacji:**

```javascript
// Convert base64 to buffer
let audioBuffer;
try {
    // Remove data URL prefix if present
    const base64Data = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
    audioBuffer = Buffer.from(base64Data, 'base64');
} catch (error) {
    return res.status(400).json({ error: 'Invalid audio data format' });
}

// DODAJ: Podstawowa walidacja rozmiaru
if (audioBuffer.length > 50 * 1024 * 1024) { // 50MB limit
    return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
}

if (audioBuffer.length < 1000) { // Minimum 1KB
    return res.status(400).json({ error: 'File too small. Minimum size is 1KB.' });
}

// DODAJ: Podstawowa walidacja audio headers
function isLikelyAudioFile(buffer) {
    // Sprawdź magic numbers dla popularnych formatów audio
    const header = buffer.slice(0, 12);
    
    // MP3 - ID3 tag lub MPEG frame
    if (header.toString('ascii', 0, 3) === 'ID3' || 
        (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0)) {
        return true;
    }
    
    // WAV - RIFF header
    if (header.toString('ascii', 0, 4) === 'RIFF' && 
        header.toString('ascii', 8, 12) === 'WAVE') {
        return true;
    }
    
    // MP4/M4A - ftyp header
    if (header.toString('ascii', 4, 8) === 'ftyp') {
        return true;
    }
    
    // OGG - OggS header
    if (header.toString('ascii', 0, 4) === 'OggS') {
        return true;
    }
    
    return false;
}

// DODAJ: Walidacja czy to audio file
if (!isLikelyAudioFile(audioBuffer)) {
    return res.status(400).json({ error: 'Invalid file type. Only audio files are allowed.' });
}
```

#### Krok 2: Dodaj walidację nazwy pliku (już jest, ale wzmocnij)

**Znajdź istniejącą walidację filename i zaktualizuj:**

```javascript
// Enhanced filename validation
function validateFilename(filename, world, lmid, questionId) {
    // Podstawowe sprawdzenie extensji
    if (!filename.endsWith('.mp3')) {
        return { valid: false, error: 'Only MP3 files are allowed' };
    }
    
    // Sprawdź czy filename zawiera potencjalnie niebezpieczne znaki
    const dangerousChars = /[<>:"/\\|?*\x00-\x1F]/;
    if (dangerousChars.test(filename)) {
        return { valid: false, error: 'Filename contains invalid characters' };
    }
    
    // Sprawdź długość nazwy
    if (filename.length > 255) {
        return { valid: false, error: 'Filename too long' };
    }
    
    // Istniejąca walidacja formatów
    const teacherFormat = filename.includes(`kids-world_${world}-lmid_${lmid}`);
    const parentFormat = filename.match(new RegExp(`^parent_[^-]+-world_${world}`));
    
    if (!teacherFormat && !parentFormat) {
        return { valid: false, error: 'Invalid filename format' };
    }
    
    return { valid: true };
}

// ZASTĄP istniejącą walidację filename:
const filenameValidation = validateFilename(filename, world, lmid, questionId);
if (!filenameValidation.valid) {
    return res.status(400).json({ error: filenameValidation.error });
}
```

#### Krok 3: Dodaj sanityzację danych wejściowych

**Na początku funkcji handler, po parsowaniu body:**

```javascript
// Sanitize input data
function sanitizeInput(data) {
    if (typeof data !== 'string') return data;
    
    // Remove potentially dangerous characters
    return data.replace(/[<>]/g, '');
}

// Apply sanitization
const sanitizedData = {
    audioData: sanitizeInput(audioData),
    filename: sanitizeInput(filename),
    world: sanitizeInput(world),
    lmid: sanitizeInput(lmid),
    questionId: sanitizeInput(questionId),
    lang: sanitizeInput(lang)
};

// Use sanitized data for the rest of the function
({ audioData, filename, world, lmid, questionId, lang } = sanitizedData);
```

### Dlaczego ta rekomendacja?
- **Prosta implementacja** - używa basic JavaScript, brak external dependencies
- **Skuteczna** - zatrzymuje większość nieprawidłowych plików
- **Backwards compatible** - nie psuje istniejącej funkcjonalności
- **Performance friendly** - sprawdza tylko nagłówki, nie całe pliki
- **Easy to maintain** - czytelny kod, łatwe debugowanie

### Harmonogram (1 godzina)
1. Dodaj size validation (10 min)
2. Dodaj magic number validation (20 min)
3. Wzmocnij filename validation (20 min)
4. Dodaj input sanitization (10 min) 