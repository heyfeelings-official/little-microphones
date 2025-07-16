# 01. Brak Weryfikacji Podpisu Webhooków Memberstack

## 🚨 POZIOM ZAGROŻENIA: KRYTYCZNY

### Opis Podatności
System nie weryfikuje podpisów webhooków od Memberstack, co pozwala atakującym na wysyłanie fałszywych webhooków.

### Dotknięte Pliki
- `api/memberstack-webhook.js` (linia 63-77)
- `utils/memberstack-utils.js` (linia 41-65)

### Rekomendowana Naprawa (Prosta - dla startupu)

#### Krok 1: Dodaj zmienną środowiskową w Vercel
```
MEMBERSTACK_WEBHOOK_SECRET=your_secret_from_memberstack_dashboard
```

#### Krok 2: Zaktualizuj funkcję weryfikacji w `utils/memberstack-utils.js`
```javascript
import crypto from 'crypto';

export function validateMemberstackWebhook(req, options = {}) {
    const signature = req.headers['x-memberstack-signature'];
    const webhookSecret = process.env.MEMBERSTACK_WEBHOOK_SECRET;
    
    // Jeśli brak secret - fallback na user agent (development)
    if (!webhookSecret) {
        const userAgent = req.headers['user-agent'] || '';
        return {
            valid: userAgent.includes('Memberstack'),
            error: userAgent.includes('Memberstack') ? null : 'Invalid user agent'
        };
    }
    
    // Pełna weryfikacja podpisu
    if (!signature) {
        return { valid: false, error: 'Missing webhook signature' };
    }
    
    try {
        const body = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');
        
        const providedSignature = signature.replace('sha256=', '');
        
        const isValid = crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        );
        
        return {
            valid: isValid,
            error: isValid ? null : 'Invalid webhook signature'
        };
    } catch (error) {
        return { valid: false, error: 'Signature verification failed' };
    }
}
```

#### Krok 3: Zaktualizuj `api/memberstack-webhook.js`
```javascript
// Na początku funkcji handler, po CORS headers:
const validation = validateMemberstackWebhook(req);
if (!validation.valid) {
    console.warn('⚠️ Webhook validation failed:', validation.error);
    return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized webhook request' 
    });
}
```

### Dlaczego ta rekomendacja?
- **Prosta implementacja** - tylko 3 kroki
- **Gradual rollout** - działa bez secret (fallback)
- **Minimalne zmiany** - tylko dodanie walidacji
- **Bezpieczna** - pełna weryfikacja HMAC gdy secret jest ustawiony
- **Bez refaktoru** - nie zmienia logiki biznesowej

### Harmonogram (1 dzień)
1. Dodaj secret do Vercel (5 min)
2. Zaktualizuj utils/memberstack-utils.js (10 min)
3. Zaktualizuj api/memberstack-webhook.js (5 min)
4. Test na staging (10 min) 