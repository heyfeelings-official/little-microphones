# 🎵 Webflow Program Page Setup Guide

## 📋 Problem Zidentyfikowany

W twoim HTML masz tylko **loading container**, ale JavaScript potrzebuje **3 kontenery**. Konsola pokazuje: `"Container not found: player-container"`

## ✅ Co masz już w HTML:
```html
<div id="program-container" class="w-layout-vflex flex-block-17">
    <div class="program-state program-loading">
        <div class="program-world-header">
            <h2 class="program-world-title">Little Microphones</h2>
            <h1 class="program-world-name" id="program-world-name">Spookyland</h1>
        </div>
        <div class="program-status-container">
            <div class="program-status-text" id="program-status-text">Loading your radio program...</div>
        </div>
        <div class="program-meta">
            <div class="program-teacher" id="program-teacher">John Teacher &amp; The Kids</div>
            <div class="program-school" id="program-school">from Elementary X</div>
        </div>
    </div>
</div>
```

## ❌ Co brakuje - Dodaj do Webflow:

### 1. **Player Container** - ID: `player-container`
```html
<div id="player-container" style="display: none;">
    <div class="program-world-header">
        <h2 class="program-world-title">Little Microphones</h2>
        <h1 class="program-world-name world-name">Spookyland</h1>
    </div>
    <div class="program-player-section">
        <audio controls class="program-audio">
            <!-- JavaScript wstrzyknie src -->
        </audio>
        <div class="program-time-display time-display">0:01 / 0:02</div>
        <div class="program-recording-count recording-count">3 recordings</div>
    </div>
    <div class="program-meta">
        <div class="program-teacher program-teacher">John Teacher & The Kids</div>
        <div class="program-school program-school">from Elementary X</div>
    </div>
</div>
```

### 2. **Generating Container** - ID: `generating-container`
```html
<div id="generating-container" style="display: none;">
    <div class="program-world-header">
        <h2 class="program-world-title">Little Microphones</h2>
        <h1 class="program-world-name world-name">Spookyland</h1>
    </div>
    <div class="program-generating-section">
        <div class="program-status-text generating-status">Generating your radio program...</div>
        <div class="program-progress-container">
            <div class="program-progress-bar progress-bar"></div>
        </div>
        <div class="program-progress-text progress-text">Mixing audio segments...</div>
    </div>
    <div class="program-meta">
        <div class="program-teacher program-teacher">John Teacher & The Kids</div>
        <div class="program-school program-school">from Elementary X</div>
    </div>
</div>
```

## 🔧 **Szybka Poprawka - Dodaj wszystkie 3 kontenery jako widoczne:**

W Webflow Designer, w sekcji gdzie masz `program-container`, dodaj te 2 dodatkowe kontenery **OBOK** istniejącego. Na czas tworzenia ustaw wszystkie jako `display: block` żeby je widzieć.

## 📝 **Klasy i ID które JavaScript będzie aktualizować:**

### **Loading State:**
- `#program-world-name` - nazwa świata
- `#program-status-text` - status loading
- `#program-teacher` - nauczyciel  
- `#program-school` - szkoła

### **Player State:**
- `.world-name` - nazwa świata
- `.program-audio` - element audio
- `.time-display` - czas odtwarzania
- `.recording-count` - liczba nagrań
- `.program-teacher` - nauczyciel
- `.program-school` - szkoła

### **Generating State:**
- `.world-name` - nazwa świata
- `.generating-status` - status generowania
- `.progress-bar` - pasek postępu
- `.progress-text` - tekst postępu
- `.program-teacher` - nauczyciel
- `.program-school` - szkoła

## 🎯 **Następny Krok:**

1. **Dodaj 2 brakujące kontenery** do Webflow
2. **Ustaw wszystkie 3 jako widoczne** (`display: block`)
3. **Przetestuj** - konsola nie powinna już pokazywać błędów
4. **Styluj** każdy kontener osobno w Webflow Designer

## 🚀 **JavaScript będzie automatycznie:**
- Ukrywać/pokazywać odpowiednie kontenery
- Aktualizować teksty i dane
- Kontrolować audio player
- Pokazywać progress bary 