# Webflow Parent Redirect System Setup

**Data:** 6 stycznia 2025  
**Wersja:** 1.0.0  
**Status:** Gotowe do wdrożenia

## Przegląd Systemu

System przekierowania rodziców umożliwia:
- Zachowanie ShareID podczas rejestracji rodzica
- Automatyczne dodawanie LMID do metadanych rodzica po weryfikacji emaila
- Przekierowanie z powrotem do oryginalnej strony ShareID
- Obsługę zarówno zalogowanych jak i niezalogowanych użytkowników

### Zalety Hostowanych Skryptów

✅ **Łatwe aktualizacje** - Skrypty są hostowane na Vercel i mogą być aktualizowane bez zmian w Webflow  
✅ **Wersjonowanie** - Każdy skrypt ma numer wersji widoczny w console.log  
✅ **Centralne zarządzanie** - Wszystkie zmiany w jednym miejscu  
✅ **Automatyczne wdrożenia** - Vercel automatycznie wdraża nowe wersje  
✅ **Backup i historia** - Pełna historia zmian w Git

## Flow Systemu

### Scenariusz 1: Zalogowany rodzic
1. Rodzic klika link `/little-microphones?ID=xyz`
2. System sprawdza login Memberstack
3. Jeśli zalogowany → natychmiast dodaje LMID do metadanych
4. Pokazuje komunikat sukcesu i przekierowuje do dashboardu

### Scenariusz 2: Niezalogowany rodzic
1. Rodzic klika link `/little-microphones?ID=xyz`
2. System sprawdza login Memberstack
3. Jeśli niezalogowany → zapisuje ShareID w localStorage
4. Rodzic rejestruje się → przekierowanie na `/members/emotion-worlds`
5. System sprawdza localStorage → przekierowuje z powrotem na `/little-microphones?ID=xyz`
6. Teraz jako zalogowany → dodaje LMID do metadanych

## Instrukcje Wdrożenia

### Krok 1: Dodanie skryptu do strony `/little-microphones`

1. Otwórz Webflow Designer
2. Przejdź do strony `/little-microphones`
3. Otwórz Page Settings (⚙️)
4. Przejdź do zakładki "Custom Code"
5. W sekcji "Before </body> tag" wklej poniższy kod:

```html
<script src="https://little-microphones.vercel.app/little-microphones-redirect.js"></script>
```

### Krok 2: Dodanie skryptu do strony `/members/emotion-worlds`

1. Otwórz Webflow Designer
2. Przejdź do strony `/members/emotion-worlds`
3. Otwórz Page Settings (⚙️)
4. Przejdź do zakładki "Custom Code"
5. W sekcji "Before </body> tag" wklej poniższy kod:

```html
<script src="https://little-microphones.vercel.app/emotion-worlds-redirect.js"></script>
```

### Krok 3: Publikacja zmian

1. Kliknij "Publish" w Webflow
2. Poczekaj na zakończenie publikacji
3. Sprawdź czy skrypty działają poprawnie

## Testowanie Systemu

### Test 1: Zalogowany rodzic
1. Zaloguj się jako rodzic w Memberstack
2. Odwiedź link `/little-microphones?ID=[prawdziwy_share_id]`
3. Sprawdź czy:
   - Pojawia się komunikat sukcesu
   - LMID zostaje dodany do metadanych
   - Następuje przekierowanie do dashboardu

### Test 2: Niezalogowany rodzic
1. Wyloguj się z Memberstack
2. Odwiedź link `/little-microphones?ID=[prawdziwy_share_id]`
3. Zarejestruj nowe konto
4. Sprawdź czy:
   - Po weryfikacji emaila następuje przekierowanie na emotion-worlds
   - Pojawia się komunikat o przekierowaniu
   - Następuje przekierowanie z powrotem na little-microphones z ShareID
   - LMID zostaje dodany do metadanych nowego użytkownika

### Test 3: Nieprawidłowy ShareID
1. Odwiedź link `/little-microphones?ID=nieprawidlowy_id`
2. Sprawdź czy pojawia się komunikat błędu

## Monitoring i Debugowanie

### Console Logs
System generuje szczegółowe logi w konsoli przeglądarki:
- `[Little Microphones Redirect]` - główny skrypt
- `[Parent Redirect]` - operacje przekierowania
- `[Emotion Worlds]` - skrypt na stronie emotion-worlds

### localStorage
System używa klucza `lm_parent_redirect` w localStorage do przechowywania:
```json
{
  "shareId": "abc12345",
  "originalPage": "/little-microphones",
  "timestamp": 1704567890123
}
```

### Komunikaty dla użytkowników
- ✅ Sukces: Zielone powiadomienia w prawym górnym rogu
- ❌ Błąd: Czerwone powiadomienia w prawym górnym rogu
- 🔄 Przekierowanie: Niebieskie powiadomienie na środku ekranu

## Konfiguracja API

System używa endpoint: `https://little-microphones.vercel.app/api`

### Używane API endpoints:
- `GET /get-world-info?shareId=xyz` - pobiera informacje o świecie
- `POST /lmid-operations` - aktualizuje metadane rodzica

## Bezpieczeństwo

### Walidacja LMID
- System sprawdza czy użytkownik ma prawo do LMID przed aktualizacją
- Używa funkcji `validateLmidOwnership` w backend API
- Blokuje próby przypisania nieprawidłowych LMID

### Wygasanie danych
- Dane w localStorage wygasają po 24 godzinach
- Automatyczne czyszczenie starych danych

## Rozwiązywanie Problemów

### Problem: Skrypt się nie ładuje
**Rozwiązanie:**
1. Sprawdź czy kod został poprawnie wklejony w Custom Code
2. Sprawdź czy nie ma błędów składni JavaScript
3. Sprawdź konsole przeglądarki pod kątem błędów

### Problem: Nie działa przekierowanie
**Rozwiązanie:**
1. Sprawdź czy localStorage zawiera dane (`lm_parent_redirect`)
2. Sprawdź czy Memberstack się prawidłowo ładuje
3. Sprawdź logi konsoli pod kątem błędów API

### Problem: LMID nie zostaje dodany
**Rozwiązanie:**
1. Sprawdź czy ShareID jest prawidłowy
2. Sprawdź czy API endpoint jest dostępny
3. Sprawdź czy użytkownik ma prawidłowe uprawnienia

## Wsparcie

W razie problemów:
1. Sprawdź logi konsoli przeglądarki
2. Sprawdź Network tab w Developer Tools
3. Sprawdź czy wszystkie API endpoints odpowiadają poprawnie

## Changelog

### v1.0.0 (6 stycznia 2025)
- Pierwsza wersja systemu przekierowania rodziców
- Obsługa localStorage dla niezalogowanych użytkowników
- Automatyczne dodawanie LMID do metadanych
- Komunikaty sukcesu/błędu dla użytkowników 