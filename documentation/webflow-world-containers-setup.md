# Webflow World Containers Setup Guide

## Cel
Konfiguracja 6 kontenerów światów na stronie głównej Little Microphones z automatycznymi tłami wideo i fallbackiem do zdjęć.

## Wymagane kontenery światów

Musisz stworzyć 6 kontenerów z klasą `program-container` i odpowiednimi atrybutami `data-world`:

### 1. Spookyland
```html
<div class="program-container" data-world="spookyland">
    <!-- Zawartość kontenera -->
    <div class="program-container-shadow"></div>
</div>
```

### 2. Shopping Spree
```html
<div class="program-container" data-world="shopping-spree">
    <!-- Zawartość kontenera -->
    <div class="program-container-shadow"></div>
</div>
```

### 3. Waterpark
```html
<div class="program-container" data-world="waterpark">
    <!-- Zawartość kontenera -->
    <div class="program-container-shadow"></div>
</div>
```

### 4. Neighborhood
```html
<div class="program-container" data-world="neighborhood">
    <!-- Zawartość kontenera -->
    <div class="program-container-shadow"></div>
</div>
```

### 5. Big City
```html
<div class="program-container" data-world="big-city">
    <!-- Zawartość kontenera -->
    <div class="program-container-shadow"></div>
</div>
```

### 6. Amusement Park
```html
<div class="program-container" data-world="amusement-park">
    <!-- Zawartość kontenera -->
    <div class="program-container-shadow"></div>
</div>
```

## Instrukcje konfiguracji w Webflow

### Krok 1: Dodaj Custom Attribute
Dla każdego kontenera `.program-container`:

1. Wybierz element kontenera
2. W panelu Settings kliknij "Add Custom Attribute"
3. Name: `data-world`
4. Value: nazwa świata (np. `spookyland`, `shopping-spree`, etc.)

### Krok 2: Zachowaj istniejącą strukturę
- Klasa główna: `program-container` (już istnieje)
- Element cienia: `program-container-shadow` (jeśli istnieje, zostaw go)
- Wszystkie inne elementy wewnętrzne pozostają bez zmian

### Krok 3: CSS dla kontenerów (już skonfigurowane)
Kontenery powinny mieć:
```css
.program-container {
    position: relative; /* Będzie ustawione automatycznie przez JS */
    overflow: hidden;   /* Dla video background */
}
```

## Automatyczne funkcje

### Video backgrounds
System automatycznie:
- Dodaje video jako tło dla każdego kontenera
- Ustawia `z-index: 1` dla video
- Ustawia `z-index: 33` dla wszystkich elementów potomnych
- Zachowuje element `.program-container-shadow` z oryginalnym z-index

### Fallback do zdjęć
Jeśli video nie załaduje się:
- Automatycznie przełącza na zdjęcie
- Używa `background-size: cover`
- Zachowuje `background-position: center`

### Dostępne tła

#### Video backgrounds (preferowane):
- **spookyland**: `https://heyfeelings.b-cdn.net/Worlds/halloween-opt.mp4`
- **shopping-spree**: `https://heyfeelings.b-cdn.net/Worlds/mall-opt.mp4`
- **waterpark**: `https://heyfeelings.b-cdn.net/Worlds/waterpark-opt.mp4`
- **neighborhood**: `https://heyfeelings.b-cdn.net/Worlds/home-opt.mp4`
- **big-city**: `https://heyfeelings.b-cdn.net/Worlds/city-opt.mp4`
- **amusement-park**: `https://heyfeelings.b-cdn.net/Worlds/funfair-opt.mp4`

#### Image backgrounds (fallback):
- **spookyland**: Fear world image
- **shopping-spree**: Anxiety world image
- **waterpark**: Empathy world image
- **neighborhood**: Boredom world image
- **big-city**: Anger world image
- **amusement-park**: Love world image

## Debugging

### Console logs
Sprawdź w konsoli przeglądarki:
```
🌍 Setting up world backgrounds for containers: [array of worlds]
🎬 Setting up background for world: [world-name]
🎬 Video background set for [world]: [video-url]
```

### Błędy
```
⚠️ Container not found for world: [world-name]
❌ Video failed to load for [world], falling back to image
🖼️ Fallback image set for [world]: [image-url]
```

## Testowanie

1. Otwórz stronę Little Microphones
2. Sprawdź konsolę przeglądarki
3. Sprawdź czy wszystkie 6 kontenerów mają tła video/zdjęcia
4. Sprawdź czy elementy wewnętrzne są widoczne nad tłem

## Uwagi techniczne

- System używa tej samej logiki co na stronach radio (`radio.js`)
- Video są automatycznie odtwarzane w pętli (muted, autoplay, loop)
- Z-index hierarchy jest zachowana dla poprawnego wyświetlania
- System jest kompatybilny z istniejącym stylingiem Webflow

## Struktura plików

- **Logika**: `little-microphones.js` (funkcje `setupWorldBackgrounds()`)
- **Konfiguracja**: `config.js` (WORLD_VIDEOS, WORLD_IMAGES)
- **Wzór**: `radio.js` (oryginalna implementacja dla pojedynczego kontenera) 