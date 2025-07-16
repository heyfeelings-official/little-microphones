# 03. Brak Rate Limiting

## ⚠️ POZIOM ZAGROŻENIA: KRYTYCZNY

### Opis Podatności
System nie ma mechanizmów ograniczania liczby żądań, co może prowadzić do ataków DDoS i nadmiernego zużycia zasobów.

### Dotknięte Pliki
- Wszystkie API endpoints (brak rate limiting)
- `vercel.json` (tylko function timeout)

### Rekomendowana Naprawa (Prosta - dla startupu)

#### Krok 1: Stwórz `utils/simple-rate-limiter.js`
```javascript
// utils/simple-rate-limiter.js
class SimpleRateLimiter {
    constructor() {
        this.requests = new Map();
        // Automatyczne czyszczenie co 5 minut
        setInterval(() => this.cleanup(), 300000);
    }

    checkLimit(ip, endpoint, maxRequests = 60, windowMs = 60000) {
        const key = `${ip}:${endpoint}`;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }
        
        const userRequests = this.requests.get(key);
        const recentRequests = userRequests.filter(time => time > windowStart);
        
        if (recentRequests.length >= maxRequests) {
            return {
                allowed: false,
                retryAfter: Math.ceil((recentRequests[0] - windowStart) / 1000)
            };
        }
        
        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        
        return {
            allowed: true,
            remaining: maxRequests - recentRequests.length
        };
    }

    cleanup() {
        const now = Date.now();
        const cutoff = now - 3600000; // 1 hour ago
        
        for (const [key, requests] of this.requests.entries()) {
            const filtered = requests.filter(time => time > cutoff);
            if (filtered.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, filtered);
            }
        }
    }
}

const rateLimiter = new SimpleRateLimiter();

export function checkRateLimit(req, res, endpoint, maxRequests = 60) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
    const result = rateLimiter.checkLimit(ip, endpoint, maxRequests);
    
    if (!result.allowed) {
        console.warn(`Rate limit exceeded for ${endpoint}`, { ip, endpoint });
        
        res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: result.retryAfter,
            message: `Too many requests. Please try again in ${result.retryAfter} seconds.`
        });
        return false;
    }
    
    // Dodaj headers o limitach
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    
    return true;
}
```

#### Krok 2: Dodaj rate limiting do krytycznych endpointów

**W `api/upload-audio.js`** (na początku funkcji handler):
```javascript
import { checkRateLimit } from '../utils/simple-rate-limiter.js';

export default async function handler(req, res) {
    // Rate limiting (10 uploads per minute)
    if (!checkRateLimit(req, res, 'upload-audio', 10)) {
        return;
    }
    
    // ... reszta kodu
}
```

**W `api/combine-audio.js`** (na początku funkcji handler):
```javascript
import { checkRateLimit } from '../utils/simple-rate-limiter.js';

export default async function handler(req, res) {
    // Rate limiting (3 combines per 5 minutes)
    if (!checkRateLimit(req, res, 'combine-audio', 3)) {
        return;
    }
    
    // ... reszta kodu
}
```

**W `api/send-email-notifications.js`** (na początku funkcji handler):
```javascript
import { checkRateLimit } from '../utils/simple-rate-limiter.js';

export default async function handler(req, res) {
    // Rate limiting (5 emails per minute)
    if (!checkRateLimit(req, res, 'send-email', 5)) {
        return;
    }
    
    // ... reszta kodu
}
```

#### Krok 3: Dodaj łagodne rate limiting do pozostałych endpointów
Dla pozostałych API endpoints (get-radio-data, list-recordings, etc.) dodaj:
```javascript
import { checkRateLimit } from '../utils/simple-rate-limiter.js';

export default async function handler(req, res) {
    // Rate limiting (60 requests per minute)
    if (!checkRateLimit(req, res, 'endpoint-name', 60)) {
        return;
    }
    
    // ... reszta kodu
}
```

### Dlaczego ta rekomendacja?
- **Bardzo prosta** - jedna klasa, jedna funkcja
- **In-memory** - nie wymaga external dependencies
- **Customizable** - różne limity per endpoint
- **Self-cleaning** - automatyczne czyszczenie starych zapisów
- **Graceful** - informuje o retry time
- **Minimal impact** - tylko 2 linie kodu per endpoint

### Harmonogram (3 godziny)
1. Stwórz utils/simple-rate-limiter.js (30 min)
2. Dodaj do krytycznych endpointów (1 godzina)
3. Dodaj do pozostałych endpointów (1 godzina)
4. Test wszystkich endpointów (30 min) 