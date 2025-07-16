# 02. Zbyt Liberalne CORS Policy

## ⚠️ POZIOM ZAGROŻENIA: KRYTYCZNY

### Opis Podatności
System używa `Access-Control-Allow-Origin: *` co pozwala na żądania z dowolnych domen i może prowadzić do ataków CSRF.

### Dotknięte Pliki
- `vercel.json` (linia 6-16)
- `utils/api-utils.js` (linia 27-31)
- Wszystkie API endpoints

### Rekomendowana Naprawa (Prosta - dla startupu)

#### Krok 1: Zaktualizuj `utils/api-utils.js`
```javascript
export function setCorsHeaders(res, methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const ALLOWED_ORIGINS = [
        'https://hey-feelings-v2.webflow.io',
        'https://heyfeelings.com',
        'https://little-microphones.vercel.app',
        'https://webflow.com',
        'https://preview.webflow.com'
    ];
    
    return function(req) {
        const origin = req.headers.origin || req.headers.referer;
        
        // Sprawdź czy origin jest dozwolony
        if (origin && ALLOWED_ORIGINS.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            // Fallback dla development i nieznanych origins
            res.setHeader('Access-Control-Allow-Origin', 'https://hey-feelings-v2.webflow.io');
        }
        
        res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Memberstack-Signature');
        res.setHeader('Access-Control-Max-Age', '86400');
        
        // Bezpieczne headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
    };
}
```

#### Krok 2: Zaktualizuj wszystkie API endpoints
Znajdź i zamień w każdym pliku `api/*.js`:

**ZAMIEŃ:**
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

**NA:**
```javascript
const corsHandler = setCorsHeaders(res, ['POST', 'OPTIONS']);
corsHandler(req);
```

#### Krok 3: Usuń globalne CORS z `vercel.json`
```json
{
  "functions": {
    "api/combine-audio.js": {
      "maxDuration": 60
    }
  }
}
```

### Dlaczego ta rekomendacja?
- **Prosta implementacja** - tylko aktualizacja jednej funkcji
- **Backwards compatible** - fallback dla nieznanych origins
- **Secure by default** - ogranicza dostęp do known domains
- **No refactoring** - używa istniejącej funkcji setCorsHeaders
- **Easy to extend** - łatwo dodać nowe domeny

### Harmonogram (2 godziny)
1. Zaktualizuj utils/api-utils.js (10 min)
2. Znajdź i zamień w API endpoints (30 min)
3. Zaktualizuj vercel.json (5 min)
4. Test każdego endpointa (1 godzina) 