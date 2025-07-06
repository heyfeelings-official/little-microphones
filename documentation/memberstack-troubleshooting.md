# Przewodnik Rozwiązywania Problemów: Integracja z Memberstack Metadata

Data: 02 Lipiec 2025
Wersja: 1.0
Status: Dokument roboczy ⚠️

## 1. Cel Dokumentu

Ten dokument zawiera wyczerpującą listę potencjalnych przyczyn problemów z zapisywaniem i usuwaniem metadanych (`lmids`) w Memberstack. Służy jako techniczna checklista do systematycznego diagnozowania problemów. Problemy są uporządkowane od najbardziej prawdopodobnych i najprostszych do najbardziej złożonych.

---

## 2. Lista Potencjalnych Problemów

### Kategoria 1: Błędy Składni i Formatu Danych (Najbardziej Prawdopodobne)

#### 1.1. Wielkość liter w kluczu `metadata`
-   **Opis**: API Memberstack jest wrażliwe na wielkość liter (case-sensitive). Klucz główny obiektu musi brzmieć `metadata` (wszystko małymi literami).
-   **Zły kod ❌**: `{"metaData":{"lmids":"..."}}` lub `{"MetaData":{"lmids":"..."}}`
-   **Dobry kod ✅**: `{"metadata":{"lmids":"..."}}`
-   **Status**: Uważamy, że ten błąd został już poprawiony w pliku `utils/lmid-utils.js`.

#### 1.2. Niepoprawna struktura obiektu JSON
-   **Opis**: Ciało żądania musi mieć precyzyjną, zagnieżdżoną strukturę. Właściwość `lmids` musi znajdować się wewnątrz obiektu `metadata`.
-   **Zły kod ❌**: `{"lmids":"..."}` (brak obiektu `metadata`)
-   **Dobry kod ✅**: `{"metadata":{"lmids":"..."}}`

#### 1.3. Niepoprawny typ danych dla `lmids`
-   **Opis**: Wartość klucza `lmids` musi być pojedynczym stringiem, w którym poszczególne ID są oddzielone przecinkami.
-   **Zły kod ❌**: `{"metadata":{"lmids":["43", "46"]}}` (jako tablica/array)
-   **Zły kod ❌**: `{"metadata":{"lmids": 43}}` (jako numer)
-   **Dobry kod ✅**: `{"metadata":{"lmids":"43,46"}}` (jako string)

---

### Kategoria 2: Błędy w Adresie URL i Endpoincie

#### 2.1. Literówka w bazowym adresie URL
-   **Opis**: Nawet mała literówka w adresie URL spowoduje, że żądanie nie dotrze do serwera.
-   **Zły adres ❌**: `https://admin.member-stack.com` lub `https://admins.memberstack.com`
-   **Dobry adres ✅**: `https://admin.memberstack.com`

#### 2.2. Niepoprawna ścieżka endpointu
-   **Opis**: Ścieżka do zasobu musi być precyzyjna, wliczając w to liczbę mnogą i wersję API.
-   **Zły endpoint ❌**: `/members/` (z ukośnikiem na końcu) lub `/member/{id}` (liczba pojedyncza)
-   **Dobry endpoint ✅**: `/members/{id}` (bez ukośnika na końcu)
-   **Uwaga**: W starszym kodzie (`memberstack-webhook.js`) znaleziono odwołanie do `https://api.memberstack.com/v1/members`. Obecnie używamy `https://admin.memberstack.com/members`. Ta zmiana mogła być źródłem problemów, jeśli nie dostosowaliśmy w pełni reszty kodu.

#### 2.3. Zła metoda HTTP
-   **Opis**: Do aktualizacji istniejącego zasobu używa się metody `PATCH`, a nie `POST` czy `PUT`.
-   **Status**: Aktualnie używamy `PATCH`, co jest poprawne.

---

### Kategoria 3: Problemy z Autoryzacją

#### 3.1. Błędny, brakujący lub niewłaściwie przypisany klucz API
-   **Opis**: Zmienna środowiskowa `MEMBERSTACK_SECRET_KEY` na Vercel musi być poprawna i dostępna dla środowiska "Production".
-   **Sprawdzenie**: Należy zweryfikować w panelu Vercel, czy klucz istnieje, jest poprawny i przypisany do wszystkich środowisk (Development, Preview, Production).

#### 3.2. Niepoprawny format lub nazwa nagłówka autoryzacyjnego
-   **Opis**: Memberstack Admin API wymaga nagłówka `x-api-key`.
-   **Zły nagłówek ❌**: `Authorization: Bearer ...` lub `X-Api-Key` (z wielkimi literami, choć to rzadko jest problemem)
-   **Dobry nagłówek ✅**: `x-api-key` (małymi literami)

---

### Kategoria 4: Błędy w Logice Aplikacji

#### 4.1. Problem z synchronizacją (Race Condition)
-   **Opis**: To jest nasza główna teoria. Funkcja `updateMemberstackMetadata` jest wywoływana natychmiast po `assignLmidToMember`. Jeśli zapis do bazy Supabase trwa ułamek sekundy dłużej, funkcja `validateLmidOwnership` (która jest częścią aktualizacji) nie znajdzie nowo dodanego LMID w bazie i uzna całą operację za nieautoryzowaną, blokując aktualizację w Memberstack.
-   **Status**: Próbowaliśmy to rozwiązać, dodając 1-sekundowe opóźnienie (`setTimeout`). Jeśli problem nadal występuje, opóźnienie może być za krótkie lub problem leży gdzie indziej.

#### 4.2. Błędy w logice składania stringa `newLmidString`
-   **Opis**: Logika, która tworzy nową listę LMIDów w formie stringa, może zawierać błędy.
-   **Przykłady błędów**:
    -   Przy usuwaniu: Pozostawienie wiszącego przecinka (`"43,"`).
    -   Przy dodawaniu: Nadpisanie starych LMIDów zamiast dodania nowego.
    -   Generowanie podwójnych przecinków (`"43,,46"`).

---

### Kategoria 5: Zmiany w API Memberstack (Czynniki Zewnętrzne)

#### 5.1. Zmiana API po stronie Memberstack
-   **Opis**: Memberstack mógł zaktualizować swoje Admin API. Format, którego używamy, mógł stać się przestarzały.
-   **Działanie**: Należy regularnie przeglądać oficjalną dokumentację Memberstack Developer Docs w poszukiwaniu ogłoszeń o zmianach (breaking changes).

#### 5.2. Konflikt między wersjami API
-   **Opis**: Jak wspomniano w pkt 2.2, mogliśmy pomieszać logikę ze starego endpointu `api.memberstack.com/v1` z nowym `admin.memberstack.com`. Nowy endpoint może wymagać zupełnie innej struktury zapytania, której nie uwzględniliśmy podczas migracji. To jest bardzo prawdopodobny scenariusz. 