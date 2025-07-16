# 05. Ekspozycja Wrażliwych Danych w Logach

## ⚠️ POZIOM ZAGROŻENIA: WYSOKIE

### Opis Podatności
System loguje adresy email i inne wrażliwe dane, co może prowadzić do wycieku informacji osobistych.

### Dotknięte Pliki
- `api/memberstack-webhook.js` (linia 128, 163)
- `api/upload-audio.js` (linia 242)
- `api/lmid-operations.js` (linia 182, 280)

### Rekomendowana Naprawa (Prosta - dla startupu)

#### Krok 1: Stwórz `utils/secure-logger.js`
```javascript
// utils/secure-logger.js
export function sanitizeEmail(email) {
    if (!email || typeof email !== 'string') return 'undefined';
    
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return 'invalid-email';
    
    const local = email.substring(0, atIndex);
    const domain = email.substring(atIndex + 1);
    
    // Pokaż pierwszą literę i domenę
    return `${local.charAt(0)}***@${domain}`;
}

export function sanitizeMemberId(id) {
    if (!id || typeof id !== 'string') return 'undefined';
    
    // Pokaż pierwsze 4 znaki
    return id.length > 4 ? `${id.substring(0, 4)}***` : id;
}

export function sanitizeLMID(lmid) {
    if (!lmid) return 'undefined';
    
    // LMID można pokazać - nie są wrażliwe
    return lmid;
}

export function secureLog(message, data = {}) {
    const sanitizedData = {};
    
    // Sanitize każde pole automatycznie
    Object.keys(data).forEach(key => {
        const value = data[key];
        
        if (key.toLowerCase().includes('email')) {
            sanitizedData[key] = sanitizeEmail(value);
        } else if (key.toLowerCase().includes('memberid')) {
            sanitizedData[key] = sanitizeMemberId(value);
        } else if (key.toLowerCase().includes('lmid')) {
            sanitizedData[key] = sanitizeLMID(value);
        } else {
            sanitizedData[key] = value;
        }
    });
    
    console.log(message, sanitizedData);
}
```

#### Krok 2: Zamień logowanie w `api/memberstack-webhook.js`

**ZNAJDŹ:**
```javascript
console.log(`Processing new educator: ${memberEmail} (${memberId})`);
```

**ZAMIEŃ NA:**
```javascript
import { secureLog } from '../utils/secure-logger.js';
secureLog('Processing new educator', { memberEmail, memberId });
```

**ZNAJDŹ:**
```javascript
console.log(`✅ LMID ${availableLmid} assigned to educator ${memberEmail}`);
```

**ZAMIEŃ NA:**
```javascript
secureLog('✅ LMID assigned to educator', { lmid: availableLmid, memberEmail });
```

#### Krok 3: Zamień logowanie w `api/upload-audio.js`

**ZNAJDŹ:**
```javascript
console.log(`📧 [${requestId}] Uploader email: ${uploaderEmail ? 'provided' : 'not provided'}`);
```

**ZAMIEŃ NA:**
```javascript
import { secureLog } from '../utils/secure-logger.js';
secureLog(`📧 [${requestId}] Uploader email status`, { 
    uploaderEmail: uploaderEmail || 'not provided',
    requestId 
});
```

#### Krok 4: Zamień logowanie w `api/lmid-operations.js`

**ZNAJDŹ:**
```javascript
console.log(`📧 Teacher email for LMID ${lmidToDelete}: ${teacherEmail}`);
```

**ZAMIEŃ NA:**
```javascript
import { secureLog } from '../utils/secure-logger.js';
secureLog('📧 Teacher email for LMID', { lmid: lmidToDelete, teacherEmail });
```

**ZNAJDŹ:**
```javascript
console.log(`📧 Retrieved parent email from Memberstack: ${parentEmail}`);
```

**ZAMIEŃ NA:**
```javascript
secureLog('📧 Retrieved parent email from Memberstack', { parentEmail });
```

#### Krok 5: Znajdź i zamień wszystkie inne wystąpienia

**Użyj find-and-replace w całym projekcie:**

**ZNAJDŹ (regex):**
```
console\.log\([^)]*email[^)]*\)
```

**RĘCZNIE PRZEJRZYJ** każde wystąpienie i zamień na secure logging.

### Dlaczego ta rekomendacja?
- **Bardzo prosta** - jedna funkcja utility do wszystkiego
- **Automatyczna** - sanitizuje na podstawie nazw pól
- **Backwards compatible** - można stopniowo wprowadzać
- **Readable** - logi nadal są czytelne dla debugowania
- **Secure by default** - domyślnie ukrywa wrażliwe dane

### Harmonogram (2 godziny)
1. Stwórz utils/secure-logger.js (15 min)
2. Zamień w api/memberstack-webhook.js (15 min)
3. Zamień w api/upload-audio.js (15 min)
4. Zamień w api/lmid-operations.js (15 min)
5. Znajdź i zamień pozostałe wystąpienia (1 godzina) 