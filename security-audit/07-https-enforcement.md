# 07. Brak Szyfrowania Danych w Transporcie

## 🔶 POZIOM ZAGROŻENIA: ŚREDNIE

### Opis Podatności
System nie wymusza HTTPS dla wszystkich endpointów i nie ma security headers.

### Dotknięte Pliki
- `vercel.json` (brak security headers)
- Wszystkie API endpoints (brak HTTPS enforcement)

### Rekomendowana Naprawa (Prosta - dla startupu)

#### Krok 1: Zaktualizuj `vercel.json`
```json
{
  "functions": {
    "api/combine-audio.js": {
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/(.*)",
      "has": [
        {
          "type": "header",
          "key": "x-forwarded-proto",
          "value": "http"
        }
      ],
      "destination": "https://little-microphones.vercel.app/$1",
      "permanent": true
    }
  ]
}
```

#### Krok 2: Dodaj HTTPS check do `utils/api-utils.js`
```javascript
// Dodaj na początek utils/api-utils.js
export function enforceHTTPS(req, res) {
    // Sprawdź czy request używa HTTPS
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    
    if (protocol !== 'https') {
        return res.status(403).json({
            error: 'HTTPS required for security reasons'
        });
    }
    
    return null; // OK, continue
}
```

#### Krok 3: Zaktualizuj funkcję `setCorsHeaders` w `utils/api-utils.js`
```javascript
// W istniejącej funkcji setCorsHeaders, dodaj security headers:
export function setCorsHeaders(res, methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
    // ... existing CORS code ...
    
    // Dodaj security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // ... rest of existing code ...
}
```

#### Krok 4: Dodaj HTTPS check do krytycznych endpointów (opcjonalnie)

**Dla najbardziej wrażliwych endpointów (upload-audio, send-email, memberstack-webhook):**

```javascript
import { enforceHTTPS } from '../utils/api-utils.js';

export default async function handler(req, res) {
    // Enforce HTTPS dla wrażliwych operacji
    const httpsCheck = enforceHTTPS(req, res);
    if (httpsCheck) return httpsCheck;
    
    // ... rest of handler code ...
}
```

### Dlaczego ta rekomendacja?
- **Vercel handles HTTPS** - automatycznie wymusza HTTPS przez redirects
- **Security headers** - podstawowa ochrona przez headers
- **Minimal code changes** - wykorzystuje istniejące funkcje
- **Progressive enhancement** - można dodać do wybranych endpointów
- **Standard compliance** - popularne security headers

### Harmonogram (30 minut)
1. Zaktualizuj vercel.json (10 min)
2. Dodaj enforceHTTPS function (5 min)
3. Zaktualizuj setCorsHeaders (10 min)
4. Test deployment (5 min) 