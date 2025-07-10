# Konfiguracja strony weryfikacji dla rodziców

## Problem
Memberstack domyślnie przekierowuje na `/undefined` po weryfikacji emaila, co powoduje błąd 404.

## Rozwiązanie
Stwórz dedykowaną stronę weryfikacji dla planu "Parents Free" + wykorzystaj istniejący system przekierowań.

## Strategia

### 1. Flow rejestracji rodzica
```
1. Rodzic klika ShareID link → `/little-microphones?ID=abc123`
2. Skrypt zapisuje ShareID w localStorage
3. Rodzic się rejestruje → przekierowanie na `/verify-parent`
4. Strona `/verify-parent` pokazuje komunikat o emailu
5. Rodzic klika link z emaila → `/little-microphones?member=...&forceRefetch=true`
6. Skrypt wykrywa weryfikację + localStorage → dodaje LMID → sukces
```

### 2. Kluczowe elementy
- **localStorage**: przechowuje ShareID między sesjami
- **Wykrywanie weryfikacji**: parametry `member` i `forceRefetch` w URL
- **Jeden główny skrypt**: obsługuje wszystkie scenariusze

## Kroki konfiguracji

### 1. W Memberstack Dashboard

1. Przejdź do **Plans** → **Parents Free**
2. W sekcji **Redirects** ustaw:
   - **On Verification Required**: `/verify-parent`
   - **On Signup**: `/little-microphones` (link z emaila będzie tu prowadzić)

### 2. W Webflow

#### Strona `/verify-parent`
1. Stwórz nową stronę: **verify-parent**
2. Dodaj podstawową strukturę:
   ```html
   <div class="verify-container">
     <h1>Rejestracja prawie ukończona!</h1>
     <p>Sprawdź swoją skrzynkę pocztową...</p>
   </div>
   ```
3. W **Page Settings** → **Custom Code** → **Before </body> tag**:
   ```html
   <script src="https://little-microphones.vercel.app/verify-parent-redirect.js"></script>
   ```

#### Strona `/little-microphones`
1. Upewnij się że ma już skrypt:
   ```html
   <script src="https://little-microphones.vercel.app/little-microphones-redirect.js"></script>
   ```

### 3. Jak to działa

#### Skrypt `/verify-parent-redirect.js`
- Pokazuje piękny komunikat o weryfikacji emaila
- Instruuje użytkownika aby sprawdził email
- Nie robi żadnych przekierowań

#### Skrypt `/little-microphones-redirect.js`
- **Pierwsza wizyta**: zapisuje ShareID, pokazuje komunikat o rejestracji
- **Po weryfikacji**: wykrywa parametry weryfikacji, pokazuje sukces, dodaje LMID
- **Zalogowany rodzic**: od razu dodaje LMID

## Komunikaty użytkownika

### Na `/verify-parent`:
```
📧 Sprawdź swoją skrzynkę pocztową!
Wysłaliśmy Ci email z linkiem weryfikacyjnym.
Kliknij w link, aby dokończyć rejestrację.

💡 Po weryfikacji zostaniesz automatycznie 
przekierowany z powrotem do programu
```

### Po weryfikacji na `/little-microphones`:
```
✅ Email zweryfikowany pomyślnie! 
Dodajemy dostęp do programu...
```

### Po dodaniu LMID:
```
✅ Dodano dostęp do programu! 
Możesz teraz go zobaczyć w swoim panelu.
```

## Testowanie

1. **Otwórz** link ShareID jako niezalogowany użytkownik
2. **Sprawdź** czy pojawia się komunikat o rejestracji
3. **Zarejestruj się** - powinno przekierować na `/verify-parent`
4. **Sprawdź** komunikat o emailu
5. **Kliknij** link z emaila - powinno wrócić do `/little-microphones`
6. **Sprawdź** komunikat o sukcesie i dodaniu LMID

## Rozwiązywanie problemów

### Link z emaila nadal prowadzi do `/undefined`
- Sprawdź ustawienia **On Signup** w planie Parents Free
- Upewnij się że Default Settings mają prawidłowe przekierowanie

### Nie ma komunikatu na `/verify-parent`
- Sprawdź czy skrypt się ładuje w konsoli
- Upewnij się że URL skryptu jest prawidłowy

### Nie dodaje LMID po weryfikacji
- Sprawdź localStorage w DevTools (`lm_parent_redirect`)
- Sprawdź konsolę czy wykrywa parametry weryfikacji
- Upewnij się że użytkownik ma plan Parents Free

## URL skryptów

- **Verify Parent**: `https://little-microphones.vercel.app/verify-parent-redirect.js`
- **Little Microphones**: `https://little-microphones.vercel.app/little-microphones-redirect.js` 