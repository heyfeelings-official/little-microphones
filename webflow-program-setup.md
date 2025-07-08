# 🎵 Webflow Program Page Setup Guide

## 📋 Wymagane Kontenery w Webflow

Musisz stworzyć **3 kontenery** w Webflow Designer z określonymi ID:

### 1. **Loading Container** - ID: `loading-container`
```html
<div id="loading-container">
    <h2>Little Microphones</h2>
    <h1 class="world-name">Spookyland</h1>
    <p class="loading-message">Loading...</p>
    <div class="program-teacher">John Teacher & The Kids</div>
    <div class="program-school">from Elementary X</div>
</div>
```

### 2. **Player Container** - ID: `player-container`
```html
<div id="player-container" style="display: none;">
    <h2>Little Microphones</h2>
    <h1 class="world-name">Spookyland</h1>
    <audio controls class="program-audio"></audio>
    <div class="time-display">0:01 / 0:02</div>
    <div class="program-teacher">John Teacher & The Kids</div>
    <div class="program-school">from Elementary X</div>
</div>
```

### 3. **Generating Container** - ID: `generating-container`
```html
<div id="generating-container" style="display: none;">
    <h2>Little Microphones</h2>
    <h1 class="world-name">Generating...</h1>
    <div class="progress-bar">
        <div class="progress-fill"></div>
    </div>
    <p class="generating-message">Progress bar here</p>
    <div class="program-teacher">John Teacher & The Kids</div>
    <div class="program-school">from Elementary X</div>
</div>
```

---

## 🎯 Wymagane Klasy i ID

### **Klasy/ID które JavaScript będzie aktualizować:**

#### **World Info (we wszystkich kontenerach):**
- `.world-name` lub `#world-name` - nazwa świata
- `.program-teacher` lub `#program-teacher` - nazwa nauczyciela
- `.program-school` lub `#program-school` - nazwa szkoły

#### **Loading Container:**
- `.loading-message` lub `#loading-message` - wiadomość ładowania
- `.loading-status` lub `#loading-status` - status ładowania

#### **Player Container:**
- `audio` element (dowolna klasa) - odtwarzacz audio
- `.current-time` lub `#current-time` - aktualny czas
- `.total-time` lub `#total-time` - całkowity czas
- `.time-display` lub `#time-display` - pełny czas "0:01 / 0:02"
- `.audio-error` lub `#audio-error` - błędy audio

#### **Generating Container:**
- `.generating-message` lub `#generating-message` - wiadomość generowania
- `.generating-status` lub `#generating-status` - status generowania
- `.progress-fill` lub `#progress-fill` - wypełnienie paska postępu
- `.progress-text` lub `#progress-text` - procent postępu

---

## 🛠️ Krok po Kroku Setup w Webflow

### **Krok 1: Struktura HTML**

1. **Dodaj 3 Div Blocks** do strony `/program`
2. **Nadaj im ID:**
   - `loading-container`
   - `player-container` 
   - `generating-container`

3. **Ustaw display: none** dla `player-container` i `generating-container` w Designer

### **Krok 2: Elementy w kontenerach**

#### **Loading Container:**
- Div Block z klasą `world-name`
- Text Block z klasą `loading-message`
- Text Block z klasą `program-teacher`
- Text Block z klasą `program-school`

#### **Player Container:**
- Div Block z klasą `world-name`
- **Audio Element** (z Webflow Components)
- Text Block z klasą `time-display`
- Text Block z klasą `program-teacher`
- Text Block z klasą `program-school`

#### **Generating Container:**
- Div Block z klasą `world-name` 
- Div Block z klasą `progress-bar`
  - Wewnątrz: Div Block z klasą `progress-fill`
- Text Block z klasą `generating-message`
- Text Block z klasą `program-teacher`
- Text Block z klasą `program-school`

### **Krok 3: JavaScript Integration**

**Dodaj do Page Settings > Custom Code > Before </body> tag:**

```html
<script>
// Skopiuj całą zawartość radio.js tutaj
// (392 linii kodu z radio.js)
</script>
```

---

## 🎨 Stylowanie w Webflow

### **Progress Bar Style:**
```css
.progress-bar {
    width: 100%;
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    width: 0%;
    transition: width 0.3s ease;
}
```

### **Container Transitions:**
```css
#loading-container,
#player-container,
#generating-container {
    transition: opacity 0.3s ease;
}
```

### **Responsive Design:**
- Użyj Webflow breakpoints
- Dostosuj rozmiary fontów
- Ukryj/pokaż elementy na mobile

---

## 🔧 Testowanie

### **Test Controls (opcjonalne):**
Dodaj te buttony do testowania stanów:

```html
<button onclick="window.RadioProgram.showLoading('Test loading...')">Loading</button>
<button onclick="window.RadioProgram.showGenerating('Test generating...', 50)">Generating</button>
<button onclick="window.RadioProgram.showPlayer('test-url', {})">Player</button>
```

---

## 📱 Jak to Działa

### **Automatyczny Flow:**
1. **Strona się ładuje** → pokazuje `loading-container`
2. **Pobiera dane** → aktualizuje world info
3. **Sprawdza czy trzeba generować:**
   - **TAK** → pokazuje `generating-container` z postępem
   - **NIE** → pokazuje `player-container` z audio

### **Kontrola z JavaScript:**
```javascript
// Przełączanie stanów
window.RadioProgram.showLoading('Loading message...')
window.RadioProgram.showPlayer('audio-url', radioData)
window.RadioProgram.showGenerating('Generating...', 75)

// Aktualizacje
window.RadioProgram.updateLoadingMessage('New message')
window.RadioProgram.updateGeneratingProgress('Processing...', 90)
```

---

## ⚠️ Ważne Uwagi

1. **Wszystkie style w Webflow** - JavaScript nie dodaje CSS
2. **ID muszą być dokładnie takie** jak w instrukcji
3. **Klasy można dostosować** - JavaScript szuka wielu wariantów
4. **Audio element** musi być w `player-container`
5. **Progress bar** potrzebuje zagnieżdżone `.progress-fill`

---

## 🚀 Gotowe do Implementacji!

Po skonfigurowaniu struktury w Webflow, JavaScript automatycznie:
- ✅ Ukrywa/pokazuje odpowiednie kontenery
- ✅ Aktualizuje teksty i dane
- ✅ Obsługuje audio player
- ✅ Zarządza progress barem
- ✅ Formatuje czas audio

**Żadnych inline styli, wszystko kontrolowane przez Webflow Designer!** 🎨 