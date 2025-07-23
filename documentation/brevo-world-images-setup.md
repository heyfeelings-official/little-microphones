# 🖼️ Brevo World Images System Setup

**STATUS:** Ready for Implementation ✅  
**CREATED:** January 2025  
**VERSION:** 1.0.0

## 🎯 **OVERVIEW**

Nowy system pozwala na dynamiczne dodawanie obrazków światów (WORLD) do szablonów email w Brevo bez tworzenia dedykowanych szablonów dla każdego świata.

**Korzyści:**
- ✅ **4 szablony zamiast 24+** (Teacher/Parent × PL/EN × 6 światów)
- ✅ **Dynamiczne obrazki** - automatyczne podstawianie w zależności od świata
- ✅ **Centralna konfiguracja** - wszystkie URLs w jednym miejscu
- ✅ **Wsparcie wielojęzyczne** - różne obrazki dla PL i EN
- ✅ **Fallback system** - domyślne obrazki jeśli konfiguracja brakuje

## 📋 **AKTUALNA STRUKTURA SZABLONÓW**

### Przed implementacją:
```
❌ Potrzeba 24+ szablonów:
- Teacher PL × 6 światów = 6 szablonów
- Teacher EN × 6 światów = 6 szablonów  
- Parent PL × 6 światów = 6 szablonów
- Parent EN × 6 światów = 6 szablonów
```

### Po implementacji:
```
✅ Tylko 4 szablony:
- Teacher PL (ID: 2) + dynamiczne obrazki
- Teacher EN (ID: 4) + dynamiczne obrazki
- Parent PL (ID: 3) + dynamiczne obrazki
- Parent EN (ID: 6) + dynamiczne obrazki
```

## 🚀 **KROKI IMPLEMENTACJI**

### **Krok 1: Wgraj Obrazki do Brevo**

1. **Przejdź do Brevo Dashboard → Media Library**
2. **Wgraj obrazki dla każdego świata w dwóch wersjach językowych:**

```
Światy do wgrania (12 obrazków total):
├── spookyland-pl.png (polska wersja)
├── spookyland-en.png (angielska wersja)
├── waterpark-pl.png
├── waterpark-en.png
├── shopping-spree-pl.png
├── shopping-spree-en.png
├── amusement-park-pl.png
├── amusement-park-en.png
├── big-city-pl.png
├── big-city-en.png
├── neighborhood-pl.png
├── neighborhood-en.png
└── default-world-pl.png (fallback)
└── default-world-en.png (fallback)
```

3. **Skopiuj URLs obrazków z Brevo Media Library**

### **Krok 2: Skonfiguruj URLs w Kodzie**

Zaktualizuj plik `utils/brevo-world-images.js`:

```javascript
export const WORLD_IMAGES_CONFIG = {
  'spookyland': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/TWÓJ_URL/spookyland-pl.png', // ⬅️ WKLEJ URL Z BREVO
      alt: 'Straszny Park - świat Halloween pełen duchów i potworów',
      displayName: 'Straszny Park'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/TWÓJ_URL/spookyland-en.png', // ⬅️ WKLEJ URL Z BREVO
      alt: 'Spookyland - Halloween world full of ghosts and monsters',
      displayName: 'Spookyland'
    }
  },
  // ... powtórz dla wszystkich światów
};
```

### **Krok 3: Zaktualizuj Szablony w Brevo**

W swoich szablonach email użyj nowych parametrów:

#### **HTML Template:**
```html
<img src="{{params.worldImageUrl}}" alt="{{params.worldImageAlt}}" />
<h2>Nowe nagranie z {{params.worldName}}!</h2>
<p>{{params.uploaderName}} dodał nowe nagranie z świata {{params.worldName}}.</p>
```

#### **Dostępne Parametry:**
```javascript
// Automatyczne z systemu obrazków
{{params.worldImageUrl}}  // URL obrazka świata
{{params.worldImageAlt}}  // Alt text dla accessibility  
{{params.worldName}}      // Nazwa świata (po polsku/angielsku)

// Istniejące parametry (bez zmian)
{{params.world}}          // ID świata (np. 'spookyland')
{{params.lmid}}           // LMID number
{{params.uploaderName}}   // Nazwa osoby która wgrała
{{params.dashboardUrl}}   // Link do dashboard
{{params.radioUrl}}       // Link do radia

// Dane kontaktu (automatyczne z Brevo)
{{contact.FIRSTNAME}}     // Imię odbiorcy
{{contact.SCHOOL_NAME}}   // Nazwa szkoły
{{contact.PLAN_NAME}}     // Nazwa planu
// ... i 29 innych atrybutów
```

### **Krok 4: Przetestuj System**

#### **Test Endpoint:**
```bash
# Test konkretnego świata
GET /api/test-world-images?world=spookyland&language=pl

# Test wszystkich światów w języku
GET /api/test-world-images?language=en

# Pełny przegląd konfiguracji
GET /api/test-world-images
```

#### **Test Integration:**
```bash
# Test email notification z obrazkami
POST /api/send-email-notifications
{
  "recipientEmail": "test@example.com",
  "notificationType": "teacher",
  "language": "pl", 
  "dynamicData": {
    "world": "spookyland",
    "lmid": "12345",
    "uploaderName": "Jan Kowalski"
  }
}
```

## 📧 **PRZYKŁAD UŻYCIA W SZABLONIE**

### **Template Email (PL):**
```html
<div style="text-align: center;">
  <img src="{{params.worldImageUrl}}" 
       alt="{{params.worldImageAlt}}" 
       style="max-width: 400px; border-radius: 8px;" />
  
  <h2>Cześć {{contact.FIRSTNAME}}! 🎉</h2>
  
  <p><strong>{{params.uploaderName}}</strong> właśnie dodał nowe nagranie z <strong>{{params.worldName}}</strong> w LMID <strong>{{params.lmid}}</strong>.</p>
  
  <p>Jako {{contact.EDUCATOR_ROLE}} w {{contact.SCHOOL_NAME}} możesz teraz posłuchać nagrania i sprawdzić postępy swoich uczniów.</p>
  
  <a href="{{params.dashboardUrl}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
    Zobacz w Dashboard
  </a>
</div>
```

### **Rezultat (automatyczne podstawienie):**
```html
<div style="text-align: center;">
  <img src="https://img.mailinblue.com/12345/spookyland-pl.png" 
       alt="Straszny Park - świat Halloween pełen duchów i potworów" 
       style="max-width: 400px; border-radius: 8px;" />
  
  <h2>Cześć Anna! 🎉</h2>
  
  <p><strong>Jan Kowalski</strong> właśnie dodał nowe nagranie z <strong>Straszny Park</strong> w LMID <strong>ABC123</strong>.</p>
  
  <p>Jako Nauczyciel w Szkoła Podstawowa nr 5 możesz teraz posłuchać nagrania i sprawdzić postępy swoich uczniów.</p>
  
  <a href="https://dashboard.heyfeelings.com/lmid/ABC123">Zobacz w Dashboard</a>
</div>
```

## 🔧 **ROZWIĄZYWANIE PROBLEMÓW**

### **Problem: Obrazki się nie wyświetlają**
```bash
# 1. Sprawdź konfigurację
GET /api/test-world-images

# 2. Sprawdź czy URLs są poprawne
# Validation pokaże missing configurations

# 3. Sprawdź czy obrazki są w Brevo Media Library
# URLs muszą być z domeny img.mailinblue.com
```

### **Problem: Fallback images**
```javascript
// Jeśli widzisz fallback images:
{
  "isSuccess": false,
  "warning": "Missing configuration for spookyland_pl"
}

// Rozwiązanie: Skonfiguruj brakujące obrazki w utils/brevo-world-images.js
```

### **Problem: Niepoprawne nazwy światów**
```javascript
// Sprawdź dostępne światy
const availableWorlds = [
  'spookyland',
  'waterpark', 
  'shopping-spree',
  'amusement-park',
  'big-city',
  'neighborhood'
];
```

## 📊 **MONITORING I ANALYTICS**

### **Log Messages:**
```javascript
// Sukces - obrazek został dodany
🖼️ Adding image data for world "spookyland" (pl): {"isSuccess":true,"hasImageUrl":true,"displayName":"Straszny Park"}

// Ostrzeżenie - brakuje konfiguracji
⚠️ Missing configuration for waterpark_en

// Info - brak świata w danych
📝 No world provided in dynamicData, skipping image enhancement
```

### **Response Data:**
```javascript
{
  "templateInfo": {
    "originalDynamicParams": 4,    // Oryginalne parametry
    "enhancedDynamicParams": 7,    // Po dodaniu obrazków
    "worldImageEnhanced": true     // Czy obrazki zostały dodane
  }
}
```

## ✅ **CHECKLIST IMPLEMENTACJI**

- [ ] **Wgraj 12 obrazków do Brevo Media Library** (6 światów × 2 języki)
- [ ] **Skopiuj URLs z Brevo i wklej do `utils/brevo-world-images.js`**
- [ ] **Uruchom test**: `GET /api/test-world-images` (should return `isProductionReady: true`)
- [ ] **Zaktualizuj szablony email w Brevo** z `{{params.worldImageUrl}}`
- [ ] **Przetestuj wysyłkę email** z każdym światem i językiem  
- [ ] **Sprawdź logi** czy obrazki są prawidłowo dodawane
- [ ] **Usuń endpoint testowy** `api/test-world-images.js` po implementacji

## 🎯 **NASTĘPNE KROKI**

1. **Upload obrazków do Brevo** (najważniejsze)
2. **Konfiguracja URLs** w kodzie  
3. **Test wszystkich kombinacji** (6 światów × 2 języki × 2 typy = 24 testy)
4. **Deploy na production** po pełnych testach
5. **Monitor email delivery** i user feedback

---

**💡 Pro Tip:** Możesz zacząć od skonfigurowania jednego świata (np. `spookyland`) w obu językach, przetestować czy działa, a następnie dodać pozostałe. 