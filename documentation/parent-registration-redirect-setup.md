# Parent Registration Redirect Setup

## Overview
System przekierowań dla rodziców po weryfikacji emaila z powrotem na stronę `/little-microphones` z ShareID.

## Problem
Po rejestracji na `/little-microphones?ID=xyz` i weryfikacji emaila, rodzice są przekierowywani na `/members/emotion-worlds` zamiast z powrotem na stronę z ShareID.

## Rozwiązanie
Użycie `localStorage` do zapamiętania ShareID i strony pochodzenia, następnie przekierowanie po weryfikacji.

## Implementacja w Webflow

### Krok 1: Dodanie skryptu do strony `/little-microphones`

W Webflow Designer:
1. Przejdź do strony `/little-microphones`
2. Otwórz **Page Settings** → **Custom Code** → **Before </body> tag**
3. Dodaj następujący kod:

```html
<script>
// Load parent registration redirect utility
(function() {
    const script = document.createElement('script');
    script.src = 'https://little-microphones.vercel.app/utils/parent-registration-redirect.js';
    script.async = true;
    document.head.appendChild(script);
})();
</script>
```

### Krok 2: Dodanie skryptu do strony `/members/emotion-worlds`

W Webflow Designer:
1. Przejdź do strony `/members/emotion-worlds`
2. Otwórz **Page Settings** → **Custom Code** → **Before </body> tag**
3. Dodaj ten sam kod co powyżej

### Krok 3: Alternatywne rozwiązanie - Inline kod

Jeśli nie chcesz ładować zewnętrznego skryptu, możesz wkleić kod bezpośrednio:

**Na stronie `/little-microphones`:**
```html
<script>
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('ID');
    
    if (shareId) {
        const registrationData = {
            shareId: shareId,
            originatingPage: '/little-microphones',
            timestamp: Date.now(),
            redirectUrl: window.location.pathname + window.location.search
        };
        
        localStorage.setItem('parentRegistrationRedirect', JSON.stringify(registrationData));
        console.log('🔄 Registration data saved for redirect:', registrationData);
    }
});
</script>
```

**Na stronie `/members/emotion-worlds`:**
```html
<script>
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const memberParam = urlParams.get('member');
    
    if (memberParam) {
        try {
            const memberData = JSON.parse(decodeURIComponent(memberParam));
            
            if (memberData.verified === true) {
                console.log('✅ Email verified, checking for redirect data...');
                
                const savedData = localStorage.getItem('parentRegistrationRedirect');
                if (savedData) {
                    const registrationData = JSON.parse(savedData);
                    
                    // Check if data is not too old (max 24 hours)
                    const maxAge = 24 * 60 * 60 * 1000;
                    if (Date.now() - registrationData.timestamp < maxAge) {
                        console.log('🔄 Redirecting to:', registrationData.redirectUrl);
                        
                        // Clear the localStorage data (one-time use)
                        localStorage.removeItem('parentRegistrationRedirect');
                        
                        // Redirect to the original page with ShareID
                        window.location.href = registrationData.redirectUrl;
                    } else {
                        console.log('⚠️ Registration data expired, clearing...');
                        localStorage.removeItem('parentRegistrationRedirect');
                    }
                }
            }
        } catch (error) {
            console.error('Error parsing member verification data:', error);
        }
    }
});
</script>
```

## Jak to działa

### Scenariusz użycia:
1. **Rodzic odwiedza**: `https://hey-feelings-v2.webflow.io/little-microphones?ID=mdew9ee4`
2. **System zapisuje** w localStorage:
   ```json
   {
     "shareId": "mdew9ee4",
     "originatingPage": "/little-microphones",
     "timestamp": 1704067200000,
     "redirectUrl": "/little-microphones?ID=mdew9ee4"
   }
   ```
3. **Rodzic się rejestruje** przez formularz Memberstack
4. **Dostaje email** z linkiem weryfikacyjnym
5. **Klika w link** → przekierowanie na `/members/emotion-worlds?member=%7B%22verified%22%3Atrue%7D&forceRefetch=true`
6. **System sprawdza** localStorage i **przekierowuje** na `/little-microphones?ID=mdew9ee4`
7. **localStorage zostaje wyczyszczony** (jednorazowe użycie)

## Bezpieczeństwo i ograniczenia

### Zabezpieczenia:
- **Wygaśnięcie danych**: 24 godziny maksymalnie
- **Jednorazowe użycie**: localStorage jest czyszczony po przekierowaniu
- **Walidacja**: Sprawdzanie poprawności danych JSON

### Ograniczenia:
- **Działa tylko w tej samej przeglądarce** (localStorage jest lokalny)
- **Nie działa w trybie prywatnym** (localStorage może być ograniczony)
- **Wymaga JavaScript** (ale to już i tak jest wymagane)

## Testowanie

### Krok po kroku:
1. Otwórz `/little-microphones?ID=test123`
2. Sprawdź w Developer Tools → Application → Local Storage czy dane zostały zapisane
3. Przejdź ręcznie na `/members/emotion-worlds?member=%7B%22verified%22%3Atrue%7D&forceRefetch=true`
4. Sprawdź czy nastąpiło przekierowanie z powrotem na `/little-microphones?ID=test123`

### Debug w konsoli:
```javascript
// Sprawdź zapisane dane
console.log(localStorage.getItem('parentRegistrationRedirect'));

// Wyczyść dane (jeśli potrzeba)
localStorage.removeItem('parentRegistrationRedirect');
```

## Wdrożenie

Po dodaniu kodu do Webflow:
1. **Opublikuj stronę** w Webflow
2. **Przetestuj** pełny flow rejestracji
3. **Sprawdź logi** w konsoli przeglądarki
4. **Monitoruj** czy przekierowania działają poprawnie 