# 06. Brak Walidacji SQL Injection

## ⚠️ POZIOM ZAGROŻENIA: WYSOKIE

### Opis Podatności
System ma miejsca gdzie mogą być dynamicznie budowane zapytania, co może prowadzić do SQL injection.

### Dotknięte Pliki
- `utils/database-utils.js` (linia 147-157)
- `api/get-radio-data.js` (linia 222-226)

### Rekomendowana Naprawa (Prosta - dla startupu)

#### Krok 1: Stwórz `utils/input-validator.js`
```javascript
// utils/input-validator.js
export function validateWorldName(world) {
    // Whitelisted worlds - tylko te są dozwolone
    const ALLOWED_WORLDS = [
        'spookyland',
        'waterpark', 
        'shopping-spree',
        'amusement-park',
        'big-city',
        'neighborhood'
    ];
    
    if (!world || typeof world !== 'string') {
        return { valid: false, sanitized: null, error: 'Invalid world parameter' };
    }
    
    // Tylko whitelisted wartości
    if (!ALLOWED_WORLDS.includes(world)) {
        return { valid: false, sanitized: null, error: 'Unknown world' };
    }
    
    return { valid: true, sanitized: world, error: null };
}

export function validateShareId(shareId) {
    if (!shareId || typeof shareId !== 'string') {
        return { valid: false, sanitized: null, error: 'Invalid shareId parameter' };
    }
    
    // ShareID powinno być tylko alphanumeric
    if (!/^[a-zA-Z0-9]+$/.test(shareId)) {
        return { valid: false, sanitized: null, error: 'ShareId contains invalid characters' };
    }
    
    // Sprawdź długość
    if (shareId.length < 5 || shareId.length > 50) {
        return { valid: false, sanitized: null, error: 'ShareId has invalid length' };
    }
    
    return { valid: true, sanitized: shareId, error: null };
}

export function validateLMID(lmid) {
    if (!lmid) {
        return { valid: false, sanitized: null, error: 'Invalid LMID parameter' };
    }
    
    // LMID powinno być numeryczne
    const numericLmid = parseInt(lmid);
    if (isNaN(numericLmid) || numericLmid <= 0 || numericLmid > 999999) {
        return { valid: false, sanitized: null, error: 'LMID must be a positive number' };
    }
    
    return { valid: true, sanitized: numericLmid, error: null };
}
```

#### Krok 2: Zaktualizuj `utils/database-utils.js`

**ZNAJDŹ tę sekcję:**
```javascript
if (world && WORLDS.includes(world)) {
    // Optimized query with world hint
    const worldColumn = `share_id_${world.replace('-', '_')}`;
    query = supabase
        .from('lmids')
        .select('lmid, assigned_to_member_id, assigned_to_member_email, status')
        .eq(worldColumn, shareId)
        .single();
}
```

**ZAMIEŃ NA:**
```javascript
import { validateWorldName, validateShareId } from './input-validator.js';

// Walidacja inputów
const worldValidation = validateWorldName(world);
const shareIdValidation = validateShareId(shareId);

if (!worldValidation.valid || !shareIdValidation.valid) {
    throw new Error('Invalid query parameters');
}

// Bezpieczny mapping kolumn - whitelisted
const COLUMN_MAP = {
    'spookyland': 'share_id_spookyland',
    'waterpark': 'share_id_waterpark',
    'shopping-spree': 'share_id_shopping_spree',
    'amusement-park': 'share_id_amusement_park',
    'big-city': 'share_id_big_city',
    'neighborhood': 'share_id_neighborhood'
};

const safeColumn = COLUMN_MAP[worldValidation.sanitized];
if (!safeColumn) {
    throw new Error('Invalid world parameter');
}

query = supabase
    .from('lmids')
    .select('lmid, assigned_to_member_id, assigned_to_member_email, status')
    .eq(safeColumn, shareIdValidation.sanitized)
    .single();
```

#### Krok 3: Zaktualizuj `api/get-radio-data.js`

**ZNAJDŹ tę sekcję:**
```javascript
const { data, error } = await supabase
    .from('lmids')
    .select('lmid, assigned_to_member_id, share_id_spookyland, ...')
    .or(`share_id_spookyland.eq.${shareId},share_id_waterpark.eq.${shareId},...`)
    .single();
```

**ZAMIEŃ NA:**
```javascript
import { validateShareId } from '../utils/input-validator.js';

// Walidacja shareId
const shareIdValidation = validateShareId(shareId);
if (!shareIdValidation.valid) {
    return res.status(400).json({ error: shareIdValidation.error });
}

// Bezpieczne zapytanie bez dynamicznego OR
const { data, error } = await supabase
    .from('lmids')
    .select('lmid, assigned_to_member_id, share_id_spookyland, share_id_waterpark, share_id_shopping_spree, share_id_amusement_park, share_id_big_city, share_id_neighborhood')
    .or(`share_id_spookyland.eq.${shareIdValidation.sanitized},share_id_waterpark.eq.${shareIdValidation.sanitized},share_id_shopping_spree.eq.${shareIdValidation.sanitized},share_id_amusement_park.eq.${shareIdValidation.sanitized},share_id_big_city.eq.${shareIdValidation.sanitized},share_id_neighborhood.eq.${shareIdValidation.sanitized}`)
    .single();
```

#### Krok 4: Dodaj walidację do wszystkich API endpoints

**We wszystkich plikach API gdzie używane są parametry world, shareId, lmid:**

```javascript
import { validateWorldName, validateShareId, validateLMID } from '../utils/input-validator.js';

// Na początku każdej funkcji handler:
if (world) {
    const worldValidation = validateWorldName(world);
    if (!worldValidation.valid) {
        return res.status(400).json({ error: worldValidation.error });
    }
    world = worldValidation.sanitized;
}

if (shareId) {
    const shareIdValidation = validateShareId(shareId);
    if (!shareIdValidation.valid) {
        return res.status(400).json({ error: shareIdValidation.error });
    }
    shareId = shareIdValidation.sanitized;
}

if (lmid) {
    const lmidValidation = validateLMID(lmid);
    if (!lmidValidation.valid) {
        return res.status(400).json({ error: lmidValidation.error });
    }
    lmid = lmidValidation.sanitized;
}
```

### Dlaczego ta rekomendacja?
- **Whitelist approach** - tylko dozwolone wartości przechodzą
- **Type safety** - walidacja typów i formatów
- **Centralized validation** - jedna funkcja dla każdego typu danych
- **Easy to maintain** - łatwo dodać nowe światy lub zmienić zasady
- **No SQL injection** - wszystkie queries używają tylko whitelisted wartości

### Harmonogram (2 godziny)
1. Stwórz utils/input-validator.js (20 min)
2. Zaktualizuj utils/database-utils.js (20 min)
3. Zaktualizuj api/get-radio-data.js (20 min)
4. Dodaj walidację do pozostałych API endpoints (1 godzina) 