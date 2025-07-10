# Konfiguracja strony weryfikacji dla rodziców

## Problem
Memberstack domyślnie przekierowuje na `/verify` zamiast `/verify-parent`, mimo ustawienia w planie Parents Free.

## Rozwiązanie
Użyj uniwersalnego skryptu na stronie `/verify` który wykrywa typ użytkownika i pokazuje odpowiedni komunikat.

## Strategia

### 1. Flow rejestracji rodzica
```
1. Rodzic klika ShareID link → `/little-microphones?ID=abc123`
2. Skrypt zapisuje ShareID w localStorage
3. Rodzic się rejestruje → przekierowanie na `/verify` (domyślne)
4. Skrypt na `/verify` wykrywa że to rodzic → pokazuje komunikat dla rodziców
5. Rodzic klika link z emaila → `/little-microphones?member=...&forceRefetch=true`
6. Skrypt wykrywa weryfikację + localStorage → dodaje LMID → sukces
```

### 2. Kluczowe elementy
- **localStorage**: przechowuje ShareID między sesjami
- **Wykrywanie typu użytkownika**: jeśli jest ShareID w localStorage = rodzic
- **Uniwersalny skrypt**: jeden skrypt obsługuje wszystkich użytkowników
- **Różne komunikaty**: rodzice vs nauczyciele/terapeuci

## Kroki konfiguracji

### 1. W Memberstack Dashboard

**Opcja A: Zostaw domyślne ustawienia**
1. Przejdź do **Default Settings**
2. Upewnij się że **On Verification Required** wskazuje na `/verify`
3. **Nie zmieniaj** ustawień w planie Parents Free

**Opcja B: Spróbuj ustawić plan-level redirect**
1. Przejdź do **Plans** → **Parents Free**
2. W sekcji **Redirects** ustaw:
   - **On Verification Required**: `/verify-parent`
   - **On Signup**: `/little-microphones`

### 2. W Webflow

#### Strona `/verify` (uniwersalna)
1. Otwórz stronę **verify** w Webflow
2. W **Page Settings** → **Custom Code** → **Before </body> tag**:
   ```html
   <script src="https://little-microphones.vercel.app/verify-universal-redirect.js"></script>
   ```

#### Strona `/little-microphones`
1. Upewnij się że ma już skrypt:
   ```html
   <script src="https://little-microphones.vercel.app/little-microphones-redirect.js"></script>
   ```

### 3. Jak to działa

#### Skrypt `/verify-universal-redirect.js`
- **Sprawdza localStorage** - szuka zapisanego ShareID
- **Jeśli ShareID istnieje** → pokazuje komunikat dla rodziców 👨‍👩‍👧‍👦
- **Jeśli brak ShareID** → pokazuje standardowy komunikat 📧
- **Nie robi przekierowań** - pozostawia to głównemu skryptowi

#### Skrypt `/little-microphones-redirect.js`
- **Pierwsza wizyta**: zapisuje ShareID, pokazuje komunikat o rejestracji
- **Po weryfikacji**: wykrywa parametry weryfikacji, pokazuje sukces, dodaje LMID
- **Zalogowany rodzic**: od razu dodaje LMID

## Komunikaty użytkownika

### Dla rodziców na `/verify`:
```
👨‍👩‍👧‍👦 Sprawdź swoją skrzynkę pocztową!
Wysłaliśmy Ci email z linkiem weryfikacyjnym.
Kliknij w link, aby uzyskać dostęp do programu.

💡 Po weryfikacji zostaniesz automatycznie 
przekierowany z powrotem do programu
```

### Dla innych użytkowników na `/verify`:
```
📧 Sprawdź swoją skrzynkę pocztową!
Wysłaliśmy Ci email z linkiem weryfikacyjnym.
Kliknij w link, aby dokończyć rejestrację.
```

### Po weryfikacji na `/little-microphones`:
```
✅ Email zweryfikowany pomyślnie! 
Dodajemy dostęp do programu...
```

## Testowanie

1. **Otwórz** link ShareID jako niezalogowany użytkownik
2. **Sprawdź** czy pojawia się komunikat o rejestracji
3. **Zarejestruj się** - powinno przekierować na `/verify`
4. **Sprawdź** czy pojawia się komunikat dla rodziców (z ikoną rodziny)
5. **Kliknij** link z emaila - powinno wrócić do `/little-microphones`
6. **Sprawdź** komunikat o sukcesie i dodaniu LMID

## Rozwiązywanie problemów

### Nadal przekierowuje na `/verify` zamiast `/verify-parent`
**To jest OK!** Uniwersalny skrypt na `/verify` wykryje że to rodzic i pokaże odpowiedni komunikat.

### Nie ma specjalnego komunikatu dla rodziców
- Sprawdź localStorage w DevTools (`lm_parent_redirect`)
- Upewnij się że ShareID został zapisany podczas pierwszej wizyty
- Sprawdź konsolę czy skrypt się ładuje

### Nie dodaje LMID po weryfikacji
- Sprawdź localStorage w DevTools (`lm_parent_redirect`)
- Sprawdź konsolę czy wykrywa parametry weryfikacji
- Upewnij się że użytkownik ma plan Parents Free

## URL skryptów

- **Universal Verify**: `https://little-microphones.vercel.app/verify-universal-redirect.js`
- **Little Microphones**: `https://little-microphones.vercel.app/little-microphones-redirect.js`

## Zalety tego rozwiązania

✅ **Nie trzeba zmieniać istniejącej strony** `/verify-parent` w Webflow  
✅ **Działa niezależnie od ustawień** Memberstack  
✅ **Jeden skrypt obsługuje wszystkich** użytkowników  
✅ **Różne komunikaty** dla różnych typów użytkowników  
✅ **Łatwe utrzymanie** - mniej skomplikowanych konfiguracji 