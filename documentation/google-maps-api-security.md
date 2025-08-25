# Google Maps API - Przewodnik Bezpieczeństwa

## 🔐 Bezpieczeństwo Google Maps API Key

### ❌ Co NIE jest problemem:
- **Widoczność klucza w konsoli/network** - to NORMALNE
- Klucz w URL żądania - **wymagane przez Google**
- Kopiowanie klucza przez użytkowników - **bezpieczne gdy właściwie ograniczone**

### ✅ Właściwe zabezpieczenie:

#### 1. **RESTRYKCJE DOMENY (HTTP Referrers)**
```bash
gcloud services api-keys update projects/PROJECT/locations/global/keys/KEY_ID \
    --api-target=service=maps-backend.googleapis.com \
    --allowed-referrers="https://little-microphones.webflow.io/*,https://*.webflow.io/*"
```

#### 2. **RESTRYKCJE API**
Ogranicz tylko do potrzebnych usług:
- `maps-backend.googleapis.com` (JavaScript API)
- `places-backend.googleapis.com` (Places API)

#### 3. **Monitoring Usage**
W Google Cloud Console > APIs & Services > Credentials:
- Monitoruj użycie klucza
- Ustaw quotas/limity dzienne
- Włącz alerty na podejrzaną aktywność

### 🛡️ Co to daje:

1. **Restrykcje domeny**: Klucz działa TYLKO na twoich stronach
2. **Restrykcje API**: Klucz może używać TYLKO określonych Google APIs
3. **Monitoring**: Widzisz każde użycie klucza

### 📋 Kroki zabezpieczenia w Google Cloud Console:

1. Idź do: `Google Cloud Console > APIs & Services > Credentials`
2. Znajdź swój Google Maps API key
3. Kliknij "Edit" (ołówek)
4. W sekcji "Application restrictions":
   - Wybierz "HTTP referrers (web sites)"
   - Dodaj: 
     - `https://little-microphones.webflow.io/*`
     - `https://*.webflow.io/*`
5. W sekcji "API restrictions":
   - Wybierz "Restrict key"
   - Zaznacz tylko:
     - `Maps JavaScript API`
     - `Places API`
6. Kliknij "Save"

### ⚠️ WAŻNE:
- Klucz skopiowany przez kogoś **NIE BĘDZIE DZIAŁAĆ** na innych stronach
- Będzie działać **TYLKO** na domenach które określisz
- To jest **znacznie bezpieczniejsze** niż hardcodowanie w kodzie

### 🔍 Weryfikacja bezpieczeństwa:
Po ustawieniu ograniczeń, próba użycia klucza z innej domeny zwróci błąd:
```
RefererNotAllowedMapError: The current URL loading the Maps JavaScript API 
has not been added to the list of allowed referrers.
```

## 📊 Stan bezpieczeństwa:

✅ **BEZPIECZNE** (z restrykcjami):
- Klucz widoczny w console - OK
- Klucz ograniczony do twojej domeny - BEZPIECZNE
- Klucz ograniczony do określonych API - BEZPIECZNE

❌ **NIEBEZPIECZNE** (naprawione):
- Hardcodowany klucz w kodzie źródłowym - NAPRAWIONE ✅
- Brak ograniczeń domeny - DO NAPRAWIENIA
- Brak ograniczeń API - DO NAPRAWIENIA

## 🎯 Podsumowanie:
**Widoczność klucza = NORMALNE**
**Bezpieczeństwo = RESTRYKCJE w Google Cloud Console**
