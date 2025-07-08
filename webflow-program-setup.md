# 🎵 Webflow Radio Program Page - Single Container Setup Guide

## 📋 Nowa Struktura - Jeden Kontener z Dynamicznymi Stanami

Zamiast 3 kontenerów, mamy teraz **JEDEN kontener** z elementami które się podmieniają:

### **Struktura HTML:**
```html
<div class="program-container">
    <!-- 1. STATYCZNY HEADER -->
    <div class="program-header">
        <h2>Little Microphones</h2>
        <h1 id="world-name">Spookyland</h1>
    </div>
    
    <!-- 2. STATYCZNE INFO NAUCZYCIELA -->
    <div class="teacher-info">
        <div id="teacher-full-name">John Teacher & The Kids</div>
        <div id="school-name">from Elementary X</div>
    </div>
    
    <!-- 3. DYNAMICZNE STANY (tylko jeden widoczny) -->
    <div id="loading-state">Loading...</div>
    <div id="generating-state" style="display: none;">Generating...</div>
    <div id="player-state" style="display: none;">[Player będzie wstrzyknięty przez JS]</div>
</div>
```

---

## 🛠️ **Krok po Kroku Setup w Webflow**

### **Krok 1: Główny Kontener**
1. **Dodaj Div Block** z klasą `program-container`
2. **Styluj** według własnego designu

### **Krok 2: Statyczny Header**
```html
<div class="program-header">
    <h2>Little Microphones</h2>
    <h1 id="world-name">Spookyland</h1>
</div>
```

**W Webflow:**
1. **Dodaj Div Block** z klasą `program-header`
2. **Dodaj H2** z tekstem "Little Microphones" (nigdy się nie zmienia)
3. **Dodaj H1** z **ID: `world-name`** i tekstem "Spookyland" (JavaScript podmieni)

### **Krok 3: Statyczne Info Nauczyciela**
```html
<div class="teacher-info">
    <div id="teacher-full-name">John Teacher & The Kids</div>
    <div id="school-name">from Elementary X</div>
</div>
```

**W Webflow:**
1. **Dodaj Div Block** z klasą `teacher-info`
2. **Dodaj Div** z **ID: `teacher-full-name`** i tekstem "John Teacher & The Kids"
3. **Dodaj Div** z **ID: `school-name`** i tekstem "from Elementary X"

### **Krok 4: Stan Loading**
```html
<div id="loading-state">
    <div id="loading-text">Loading your radio program...</div>
</div>
```

**W Webflow:**
1. **Dodaj Div Block** z **ID: `loading-state`**
2. **Dodaj Text Block** z **ID: `loading-text`** i tekstem "Loading your radio program..."
3. **Styluj** według potrzeb (spinner, animacje, etc.)

### **Krok 5: Stan Generating**
```html
<div id="generating-state" style="display: none;">
    <div id="generating-text">Generating your radio program...</div>
</div>
```

**W Webflow:**
1. **Dodaj Div Block** z **ID: `generating-state`**
2. **Ustaw Display: None** w Designer
3. **Dodaj Text Block** z **ID: `generating-text`** i tekstem "Generating your radio program..."
4. **Styluj** (może być animacja ładowania)

### **Krok 6: Stan Player**
```html
<div id="player-state" style="display: none;">
    <!-- JavaScript wstrzyknie customowy player tutaj -->
</div>
```

**W Webflow:**
1. **Dodaj Div Block** z **ID: `player-state`**
2. **Ustaw Display: None** w Designer
3. **Zostaw pusty** - JavaScript wstrzyknie cały player
4. **Styluj kontener** (padding, background, etc.)

---

## 🎯 **Wymagane ID dla JavaScript:**

### **Statyczne Elementy:**
- `#world-name` - nazwa świata (JavaScript podmieni)
- `#teacher-full-name` - imię nauczyciela (JavaScript podmieni)
- `#school-name` - nazwa szkoły (JavaScript podmieni)

### **Stany Dynamiczne:**
- `#loading-state` - kontener loading (JavaScript pokaże/ukryje)
- `#loading-text` - tekst loading (JavaScript podmieni)
- `#generating-state` - kontener generating (JavaScript pokaże/ukryje)
- `#generating-text` - tekst generating (JavaScript podmieni losowe)
- `#player-state` - kontener player (JavaScript wstrzyknie player)

---

## 🎨 **Stylowanie w Webflow**

### **Program Container:**
```css
.program-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    border-radius: 20px;
    /* Tło świata zostanie ustawione przez JavaScript */
}
```

### **Header:**
```css
.program-header {
    text-align: center;
    margin-bottom: 20px;
}

.program-header h2 {
    font-size: 16px;
    opacity: 0.8;
    margin-bottom: 10px;
}

.program-header h1 {
    font-size: 36px;
    font-weight: bold;
    margin: 0;
}
```

### **Teacher Info:**
```css
.teacher-info {
    text-align: center;
    margin-bottom: 30px;
}

#teacher-full-name {
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 5px;
}

#school-name {
    font-size: 14px;
    opacity: 0.7;
}
```

### **Loading State:**
```css
#loading-state {
    text-align: center;
    padding: 40px 20px;
}

#loading-text {
    font-size: 18px;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
}
```

### **Generating State:**
```css
#generating-state {
    text-align: center;
    padding: 40px 20px;
}

#generating-text {
    font-size: 16px;
    font-style: italic;
    color: #666;
}
```

### **Player State:**
```css
#player-state {
    padding: 20px;
    background: rgba(255,255,255,0.1);
    border-radius: 15px;
    backdrop-filter: blur(10px);
}

/* Style dla elementów playera (opcjonalne) */
.audio-player-container {
    /* JavaScript wstrzyknie player - możesz stylować */
}
```

---

## 🚀 **Jak to Działa:**

### **JavaScript Logic:**
1. **Statyczne elementy** nigdy się nie ukrywają - tylko zmieniają tekst
2. **Stany dynamiczne** - tylko jeden widoczny na raz:
   - Loading → Generating → Player
3. **Player** jest wstrzykiwany przez JavaScript (customowy z /rp)

### **Automatyczne Funkcje:**
- ✅ **Tło świata** ustawiane automatycznie
- ✅ **Nazwa świata** formatowana (spookyland → Spookyland)
- ✅ **Dane nauczyciela** pobierane z Memberstack
- ✅ **Zabawne teksty** podczas generating (15 losowych)
- ✅ **Customowy player** z pełną kontrolą

### **Development Mode:**
- Wszystkie 3 stany widoczne jednocześnie z ramkami
- Ustaw `DEVELOPMENT_MODE = false` gdy skończysz

---

## 📱 **Responsive Design:**

Pamiętaj o:
- **Mobile breakpoints** w Webflow
- **Font sizes** na różnych urządzeniach  
- **Padding/margins** dla mobile
- **Player controls** na touch devices

---

## ✅ **Checklist Setup:**

- [ ] Główny kontener `.program-container`
- [ ] Header z `#world-name`
- [ ] Teacher info z `#teacher-full-name` i `#school-name`
- [ ] Loading state z `#loading-state` i `#loading-text`
- [ ] Generating state z `#generating-state` i `#generating-text` (hidden)
- [ ] Player state z `#player-state` (hidden)
- [ ] Wszystkie style w Webflow Designer
- [ ] Test na mobile i desktop

**Po setup ustaw `DEVELOPMENT_MODE = false` w radio.js!** 🎉 