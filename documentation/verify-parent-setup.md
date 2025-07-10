# Konfiguracja strony weryfikacji dla rodziców

## Problem
Memberstack domyślnie przekierowuje na `/undefined` po weryfikacji emaila, co powoduje błąd 404.

## Rozwiązanie
Stwórz dedykowaną stronę weryfikacji dla planu "Parents Free" która obsłuży przekierowanie z powrotem do ShareID.

## Kroki konfiguracji

### 1. W Memberstack Dashboard

1. Przejdź do **Plans** → **Parents Free**
2. W sekcji **Redirects** ustaw:
   - **On Verification Required**: `/verify-parent`
   
   LUB jeśli to nie działa:
   
3. Przejdź do **Default Settings**
4. Upewnij się że **On Verification Required** wskazuje na `/verify`

### 2. W Webflow

#### Opcja A: Dedykowana strona `/verify-parent`

1. Stwórz nową stronę: **verify-parent**
2. Dodaj podstawową strukturę HTML:
   ```html
   <div class="verify-container">
     <h1>Weryfikacja emaila</h1>
     <p>Trwa weryfikacja Twojego konta...</p>
   </div>
   ```

3. W **Page Settings** → **Custom Code** → **Before </body> tag** dodaj:
   ```html
   <script src="https://little-microphones.vercel.app/verify-parent-redirect.js"></script>
   ```

#### Opcja B: Użyj istniejącej strony `/verify`

1. Otwórz stronę **verify** w Webflow
2. W **Page Settings** → **Custom Code** → **Before </body> tag** dodaj:
   ```html
   <script src="https://little-microphones.vercel.app/verify-parent-redirect.js"></script>
   ```

### 3. Testowanie

1. Zarejestruj się jako rodzic przez link ShareID
2. Sprawdź email weryfikacyjny
3. Kliknij link - powinien prowadzić do `/verify-parent` lub `/verify`
4. Strona powinna pokazać komunikat sukcesu
5. Po 2 sekundach nastąpi przekierowanie do oryginalnego ShareID

## Jak działa skrypt

1. **Sprawdza localStorage** - szuka zapisanego ShareID
2. **Pokazuje komunikat** - informuje o sukcesie weryfikacji
3. **Przekierowuje** - wraca do `/little-microphones?ID=shareId`
4. **Czyści dane** - usuwa zapisane informacje z localStorage

## Komunikaty

- **Z ShareID**: "Email zweryfikowany pomyślnie!" → przekierowanie do ShareID
- **Bez ShareID**: "Email zweryfikowany!" → przekierowanie do dashboard

## Rozwiązywanie problemów

### Link nadal prowadzi do `/undefined`

1. Sprawdź ustawienia planu w Memberstack
2. Upewnij się że strona `/verify-parent` istnieje w Webflow
3. Sprawdź czy Default Settings mają ustawione przekierowanie

### Skrypt nie działa

1. Sprawdź konsolę przeglądarki
2. Upewnij się że skrypt się ładuje
3. Sprawdź czy localStorage zawiera dane (`lm_parent_redirect`)

### Brak przekierowania po weryfikacji

1. Sprawdź czy dane w localStorage nie są za stare (>24h)
2. Upewnij się że ShareID został zapisany podczas pierwszej wizyty 