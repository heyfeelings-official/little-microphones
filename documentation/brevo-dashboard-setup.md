# Konfiguracja Widoku Kontaktów w Brevo Dashboard

## Problem: Atrybuty nie są widoczne w liście kontaktów

Atrybuty są **poprawnie synchronizowane** z Brevo, ale nie są wyświetlane w widoku listy kontaktów. Trzeba skonfigurować kolumny w Brevo Dashboard.

## Rozwiązanie: Dostosowanie kolumn w Brevo

### Krok 1: Przejdź do listy kontaktów
1. Zaloguj się do [Brevo Dashboard](https://app.brevo.com)
2. Przejdź do **Contacts** → **Contacts**
3. Wybierz listę **"Hey Feelings List #2"**

### Krok 2: Dostosuj kolumny
1. W prawym górnym rogu kliknij **"Customize columns"** (ikona ustawień)
2. Zaznacz kolumny, które chcesz wyświetlić:

#### ✅ Podstawowe atrybuty (już dostępne):
- [x] **USER_CATEGORY** - Kategoria użytkownika (parents/educators/therapists)
- [x] **PLAN_TYPE** - Typ planu (free/paid)
- [x] **PLAN_NAME** - Nazwa planu (np. "Educators Free")
- [x] **PLAN_ID** - ID planu Memberstack
- [x] **SCHOOL_NAME** - Nazwa szkoły/organizacji
- [x] **TEACHER_NAME** - Imię i nazwisko nauczyciela
- [x] **LMIDS** - Przypisane LMID-y
- [x] **MEMBERSTACK_ID** - ID członka w Memberstack
- [x] **LANGUAGE_PREF** - Preferowany język (pl/en)
- [x] **REGISTRATION_DATE** - Data rejestracji
- [x] **LAST_SYNC** - Ostatnia synchronizacja

### Krok 3: Tworzenie brakujących atrybutów (opcjonalne)

Jeśli chcesz wyświetlać dodatkowe szczegóły, utwórz ręcznie te atrybuty w Brevo:

#### W Brevo Dashboard → Contacts → Contact attributes:
1. **SCHOOL_CITY** (Text) - Miasto szkoły
2. **SCHOOL_COUNTRY** (Text) - Kraj szkoły  
3. **EDUCATOR_ROLE** (Text) - Rola edukatora (Teacher/Principal/Admin)
4. **EDUCATOR_NO_KIDS** (Number) - Liczba uczniów
5. **EDUCATOR_NO_CLASSES** (Number) - Liczba klas
6. **SCHOOL_ADDRESS** (Text) - Adres szkoły
7. **SCHOOL_FACILITY_TYPE** (Text) - Typ placówki
8. **SCHOOL_PHONE** (Text) - Telefon szkoły
9. **SCHOOL_WEBSITE** (Text) - Strona szkoły

### Krok 4: Filtrowanie i segmentacja

Po skonfigurowaniu kolumn możesz:

1. **Filtrować kontakty** bezpośrednio w liście:
   - `USER_CATEGORY = "educators"`
   - `PLAN_TYPE = "paid"`
   - `SCHOOL_CITY = "Warsaw"`

2. **Tworzyć segmenty dynamiczne** w **Contacts** → **Segments**:
   - **Edukatorzy z Warszawy**: `USER_CATEGORY equals "educators" AND SCHOOL_CITY equals "Warsaw"`
   - **Płatni użytkownicy**: `PLAN_TYPE equals "paid"`
   - **Duże szkoły**: `EDUCATOR_NO_KIDS greater than 100`

## Wynik

Po konfiguracji widoku zobaczysz wszystkie szczegóły użytkowników:

| Email | USER_CATEGORY | PLAN_TYPE | SCHOOL_NAME | SCHOOL_CITY | EDUCATOR_ROLE | LMIDS |
|-------|---------------|-----------|-------------|-------------|---------------|-------|
| pierre.dubois@ecole-paris.fr | educators | free | École Primaire de Paris | Paris | Teacher | 191 |
| anna.kowalczyk@sp15.edu.pl | educators | free | Primary School No. 15 | Krakow | Teacher | 186 |

## Status synchronizacji

✅ **Atrybuty są poprawnie synchronizowane** - problem był tylko w wyświetlaniu  
✅ **Wszystkich 13 testowych użytkowników zsynchronizowano pomyślnie**  
✅ **System segmentacji Brevo działa poprawnie** 