// utils/input-validator.js
// Input validation utilities for security protection

export function validateWorldName(world) {
    // Whitelisted worlds - tylko te są dozwolone
    const ALLOWED_WORLDS = [
        'spookyland',
        'waterpark', 
        'shopping-spree',
        'amusement-park',
        'big-city',
        'neighborhood'
    ];
    
    if (!world || typeof world !== 'string') {
        return { valid: false, sanitized: null, error: 'Invalid world parameter' };
    }
    
    // Tylko whitelisted wartości
    if (!ALLOWED_WORLDS.includes(world)) {
        return { valid: false, sanitized: null, error: 'Unknown world' };
    }
    
    return { valid: true, sanitized: world, error: null };
}

export function validateShareId(shareId) {
    if (!shareId || typeof shareId !== 'string') {
        return { valid: false, sanitized: null, error: 'Invalid shareId parameter' };
    }
    
    // ShareID powinno być tylko alphanumeric
    if (!/^[a-zA-Z0-9]+$/.test(shareId)) {
        return { valid: false, sanitized: null, error: 'ShareId contains invalid characters' };
    }
    
    // Sprawdź długość (ShareID jest zwykle 8-16 znaków)
    if (shareId.length < 4 || shareId.length > 20) {
        return { valid: false, sanitized: null, error: 'ShareId has invalid length' };
    }
    
    return { valid: true, sanitized: shareId, error: null };
}

export function validateLMID(lmid) {
    if (!lmid || typeof lmid !== 'string') {
        return { valid: false, sanitized: null, error: 'Invalid LMID parameter' };
    }
    
    // LMID powinno być tylko alphanumeric (może zawierać myślniki)
    if (!/^[a-zA-Z0-9-]+$/.test(lmid)) {
        return { valid: false, sanitized: null, error: 'LMID contains invalid characters' };
    }
    
    // Sprawdź długość
    if (lmid.length < 1 || lmid.length > 30) {
        return { valid: false, sanitized: null, error: 'LMID has invalid length' };
    }
    
    return { valid: true, sanitized: lmid, error: null };
}

export function validateQuestionId(questionId) {
    if (!questionId || typeof questionId !== 'string') {
        return { valid: false, sanitized: null, error: 'Invalid questionId parameter' };
    }
    
    // QuestionID powinno być tylko alphanumeric
    if (!/^[a-zA-Z0-9-_]+$/.test(questionId)) {
        return { valid: false, sanitized: null, error: 'QuestionId contains invalid characters' };
    }
    
    // Sprawdź długość
    if (questionId.length < 1 || questionId.length > 50) {
        return { valid: false, sanitized: null, error: 'QuestionId has invalid length' };
    }
    
    return { valid: true, sanitized: questionId, error: null };
}

export function validateLanguage(lang) {
    // Whitelisted języki
    const ALLOWED_LANGUAGES = ['en', 'pl', 'es', 'fr', 'de', 'it'];
    
    if (!lang || typeof lang !== 'string') {
        return { valid: false, sanitized: null, error: 'Invalid language parameter' };
    }
    
    // Tylko whitelisted wartości
    if (!ALLOWED_LANGUAGES.includes(lang)) {
        return { valid: false, sanitized: 'en', error: 'Unsupported language, defaulting to English' };
    }
    
    return { valid: true, sanitized: lang, error: null };
}

export function validateFilename(filename) {
    if (!filename || typeof filename !== 'string') {
        return { valid: false, sanitized: null, error: 'Invalid filename parameter' };
    }
    
    // Usuń potencjalnie niebezpieczne znaki
    const sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
    
    // Sprawdź czy po sanityzacji coś zostało
    if (sanitized.length === 0) {
        return { valid: false, sanitized: null, error: 'Filename contains only invalid characters' };
    }
    
    // Sprawdź długość
    if (sanitized.length > 255) {
        return { valid: false, sanitized: null, error: 'Filename too long' };
    }
    
    return { valid: true, sanitized: sanitized, error: null };
}

export function validateMemberId(memberId) {
    if (!memberId || typeof memberId !== 'string') {
        return { valid: false, sanitized: null, error: 'Invalid memberId parameter' };
    }
    
    // MemberId powinno być tylko alphanumeric i może zawierać myślniki/podkreślenia
    if (!/^[a-zA-Z0-9-_]+$/.test(memberId)) {
        return { valid: false, sanitized: null, error: 'MemberId contains invalid characters' };
    }
    
    // Sprawdź długość
    if (memberId.length < 10 || memberId.length > 50) {
        return { valid: false, sanitized: null, error: 'MemberId has invalid length' };
    }
    
    return { valid: true, sanitized: memberId, error: null };
}

// Uniwersalna funkcja do sanityzacji stringów
export function sanitizeInput(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    // Usuń potencjalnie niebezpieczne znaki
    return input.replace(/[<>]/g, '').trim();
}

// Funkcja do walidacji wszystkich parametrów API jednocześnie
export function validateApiParams(params) {
    const results = {};
    const errors = [];
    
    if (params.world !== undefined) {
        const result = validateWorldName(params.world);
        results.world = result.sanitized;
        if (!result.valid) errors.push(result.error);
    }
    
    if (params.shareId !== undefined) {
        const result = validateShareId(params.shareId);
        results.shareId = result.sanitized;
        if (!result.valid) errors.push(result.error);
    }
    
    if (params.lmid !== undefined) {
        const result = validateLMID(params.lmid);
        results.lmid = result.sanitized;
        if (!result.valid) errors.push(result.error);
    }
    
    if (params.questionId !== undefined) {
        const result = validateQuestionId(params.questionId);
        results.questionId = result.sanitized;
        if (!result.valid) errors.push(result.error);
    }
    
    if (params.lang !== undefined) {
        const result = validateLanguage(params.lang);
        results.lang = result.sanitized;
        if (!result.valid) errors.push(result.error);
    }
    
    if (params.filename !== undefined) {
        const result = validateFilename(params.filename);
        results.filename = result.sanitized;
        if (!result.valid) errors.push(result.error);
    }
    
    if (params.memberId !== undefined) {
        const result = validateMemberId(params.memberId);
        results.memberId = result.sanitized;
        if (!result.valid) errors.push(result.error);
    }
    
    return {
        valid: errors.length === 0,
        sanitized: results,
        errors: errors
    };
} 