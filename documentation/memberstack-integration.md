# Architektura Integracji z Memberstack

Data: 02 Lipiec 2025
Wersja: 1.0
Status: Aktualny ✅

## 1. Przegląd Architektury

Nasza aplikacja wykorzystuje **hybrydowe podejście** do integracji z Memberstack. Rozdzielamy zadania pomiędzy frontend (przeglądarkę użytkownika) a backend (funkcje serverless na Vercel), aby zmaksymalizować bezpieczeństwo i wydajność.

-   **Frontend (DOM Package)**: Odpowiedzialny za odczytywanie danych i inicjowanie akcji. Nie ma uprawnień do zapisu wrażliwych danych.
-   **Backend (Admin REST API)**: Odpowiedzialny za modyfikację danych użytkownika, w tym metadanych. Operacje te wymagają tajnego klucza API i dlatego muszą być wykonywane po stronie serwera.

---

## 2. Integracja Frontend

Integracja po stronie klienta opiera się na oficjalnym pakiecie `@memberstack/dom`.

-   **Biblioteka**: `@memberstack/dom` (wersja 2.0)
-   **Plik implementacji**: `lm.js`
-   **Inicjalizacja**: Pakiet jest ładowany i inicjalizowany za pomocą globalnego obiektu `$memberstackDom` w głównych plikach HTML.

### Kluczowe zadania frontendu:

#### a) Odczyt Danych Użytkownika

Frontend bezpiecznie pobiera dane zalogowanego użytkownika, aby wyświetlić spersonalizowane informacje.

-   **Metoda**: `memberstack.getCurrentMember()`
-   **Cel**: Pobranie obiektu `member`, który zawiera m.in. `id` oraz `metaData`.
-   **Przykład z `lm.js`**:
    ```javascript
    // Pobranie danych członka, w tym jego LMID z metadanych
    const { data: memberData } = await memberstack.getCurrentMember();
    const currentLmids = memberData.metaData.lmids; 
    ```

#### b) Inicjowanie Akcji Backendowych

Frontend nigdy nie modyfikuje metadanych bezpośrednio. Zamiast tego, akcje użytkownika (np. kliknięcie "Dodaj Program") wysyłają żądanie do naszego własnego API na Vercel.

-   **Endpoint docelowy**: `/api/lmid-operations`
-   **Metoda**: `POST`
-   **Przykład z `lm.js` (dodawanie LMID)**:
    ```javascript
    const response = await fetch(`${API_BASE_URL}/api/lmid-operations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: 'add',
        memberId: memberId,
        memberEmail: memberEmail,
        currentLmids: lmidFromMeta || '',
      }),
    });
    ```

---

## 3. Integracja Backend

Integracja po stronie serwera jest sercem operacji zapisu i jest oparta na **Memberstack Admin REST API**.

-   **API**: Memberstack Admin REST API
-   **Adres bazowy**: `https://admin.memberstack.com`
-   **Uwierzytelnienie**: Wszystkie żądania do Admin API muszą zawierać nagłówek `x-api-key` z wartością `MEMBERSTACK_SECRET_KEY`. Klucz ten jest przechowywany jako tajna zmienna środowiskowa na Vercel.

### Kluczowa operacja: Aktualizacja Metadanych

To jest centralny punkt, który zawodził i został naprawiony.

-   **Endpoint**: `PATCH https://admin.memberstack.com/members/{MEMBER_ID}`
-   **Plik implementacji**: Główna logika znajduje się w `utils/lmid-utils.js` w funkcji `updateMemberstackMetadata`.
-   **Ciało żądania (Request Body)**: Aby zaktualizować metadane, wysyłamy obiekt JSON w ściśle określonym formacie. **Klucz musi być pisany małymi literami: `metadata`**.

    ```json
    {
      "metadata": {
        "lmids": "nowa,kompletna,lista,lmidów"
      }
    }
    ```

### Pliki zaangażowane w proces backendowy:

1.  **`utils/lmid-utils.js`**:
    -   Zawiera funkcję `updateMemberstackMetadata`, która jest fundamentem komunikacji z Admin API.
    -   Konstruuje żądanie `fetch`, dodaje nagłówki i wysyła dane do Memberstack.
    -   Zawiera również szczegółowe logowanie, które dodaliśmy w celu debugowania.

2.  **`api/lmid-operations.js`**:
    -   Główny, skonsolidowany endpoint dla operacji na LMID (dodawanie, usuwanie).
    -   Importuje i wywołuje `updateMemberstackMetadata` po wykonaniu operacji na naszej bazie danych Supabase.
    -   Zawiera logikę opóźnienia (1 sekunda), aby zapobiec problemom z synchronizacją danych (timing issues).

3.  **`api/memberstack-webhook.js`**:
    -   Specjalny endpoint do obsługi webhooka `member.created`.
    -   Również importuje i wywołuje `updateMemberstackMetadata`, aby przypisać LMID nowo zarejestrowanym użytkownikom.

4.  **`api/handle-new-member.js`**:
    -   Endpoint do obsługi rejestracji nowych członków na podstawie ShareID.
    -   Również importuje i wywołuje `updateMemberstackMetadata`, aby przypisać LMID nowo zarejestrowanym użytkownikom.

### Schemat Przepływu Danych (Dodawanie LMID)

1.  **Użytkownik** klika "Dodaj Program" na stronie.
2.  **`lm.js`** wysyła żądanie `POST` do `/api/lmid-operations` z akcją `add`.
3.  **`api/lmid-operations.js`** odbiera żądanie:
    a. Tworzy nowy LMID w bazie **Supabase**.
    b. **Czeka 1 sekundę** (naprawiony timing issue).
    c. Wywołuje `updateMemberstackMetadata` z `utils/lmid-utils.js`.
4.  **`updateMemberstackMetadata`** wysyła żądanie `PATCH` do **Memberstack Admin API** z poprawnym formatem `{"metadata": ...}`.
5.  **Memberstack** aktualizuje metadane użytkownika.
6.  Odpowiedź wraca tą samą drogą, a frontend odświeża interfejs.

---

## 4. Naprawy Implementowane w Styczniu 2025

### Problem: Niespójna Synchronizacja LMID z Memberstack

**Objawy**: System dodawał LMID do bazy danych Supabase, ale nie aktualizował metadanych w Memberstack, co powodowało brak synchronizacji między systemami.

### Zidentyfikowane Problemy:

1. **Lokalne Funkcje updateMemberstackMetadata**:
   - `api/memberstack-webhook.js` zawierał lokalną funkcję `updateMemberstackMetadata` używającą starego API
   - Używała `MEMBERSTACK_API_KEY` zamiast `MEMBERSTACK_SECRET_KEY`
   - Używała starego endpointu `https://api.memberstack.com/v1/members/` zamiast `https://admin.memberstack.com/members/`
   - Używała nieprawidłowych nagłówków `X-API-Key` zamiast `x-api-key`
   - Używała nieprawidłowej struktury body `metaData` zamiast `metadata`

2. **Brak Aktualizacji Metadanych**:
   - `api/handle-new-member.js` w ogóle nie aktualizował metadanych Memberstack
   - Przypisywał LMID tylko w bazie danych Supabase

3. **Niespójne Klucze API**:
   - Różne pliki używały różnych zmiennych środowiskowych (`MEMBERSTACK_API_KEY` vs `MEMBERSTACK_SECRET_KEY`)

### Zastosowane Naprawy:

1. **Zunifikowana Implementacja**:
   - Usunięto lokalną funkcję `updateMemberstackMetadata` z `api/memberstack-webhook.js`
   - Dodano import zunifikowanej funkcji z `utils/lmid-utils.js`
   - Wszystkie endpointy teraz używają tej samej, poprawnej implementacji

2. **Dodano Aktualizację Metadanych**:
   - Dodano wywołanie `updateMemberstackMetadata` w `api/handle-new-member.js`
   - Dodano generowanie ShareIDs dla nowych członków
   - Dodano opóźnienie 1 sekundy dla spójności bazy danych

3. **Uspójniono Konfigurację**:
   - Wszystkie pliki używają `MEMBERSTACK_SECRET_KEY`
   - Wszystkie pliki używają `https://admin.memberstack.com/members/`
   - Wszystkie pliki używają nagłówka `x-api-key`
   - Wszystkie pliki używają struktury body `{"metadata": {"lmids": "..."}}`

### Zmiany w Plikach:

- **`api/memberstack-webhook.js`**: Usunięto lokalną funkcję, dodano import z utils
- **`api/handle-new-member.js`**: Dodano aktualizację metadanych Memberstack
- **`utils/lmid-utils.js`**: Pozostał bez zmian (już był poprawny)
- **`api/lmid-operations.js`**: Pozostał bez zmian (już był poprawny)

### Rezultat:

Teraz wszystkie operacje LMID (tworzenie, dodawanie, usuwanie) poprawnie synchronizują się z Memberstack, zapewniając spójność danych między Supabase a Memberstack.

---

## 5. Testowanie

### Endpoint Testowy: `/api/test-memberstack`

Dostępny jest endpoint do testowania synchronizacji metadanych:

```javascript
// POST /api/test-memberstack
{
  "memberId": "mem_123456789"
}
```

Ten endpoint:
1. Pobiera poprawne LMIDs z bazy danych Supabase
2. Wymusza aktualizację metadanych w Memberstack
3. Zwraca wynik synchronizacji

### Wymagane Zmienne Środowiskowe na Vercel:

- `MEMBERSTACK_SECRET_KEY`: Klucz do Memberstack Admin API
- `SUPABASE_URL`: URL bazy danych Supabase
- `SUPABASE_ANON_KEY`: Klucz publiczny Supabase

---

**Ostatnia Aktualizacja**: 16 Styczeń 2025  
**Status**: Naprawiony i Przetestowany ✅ 