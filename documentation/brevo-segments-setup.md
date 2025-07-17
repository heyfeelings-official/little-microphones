# Brevo Dynamic Segments Setup Guide

## Overview
Po implementacji nowej architektury Brevo, wszystkie kontakty idą do głównej listy "Hey Feelings List #2", a segmentacja odbywa się przez dynamiczne filtry w Brevo Dashboard.

## Aktualna Architektura

### ✅ Listy (Static Collections)
- **Hey Feelings List #2**: Wszyscy kontakty z systemu

### ✅ Atrybuty Kontaktów (dla segmentacji)
Każdy kontakt ma bogate atrybuty z Memberstack:

**Plan Information:**
- `USER_CATEGORY`: parents, educators, therapists  
- `PLAN_TYPE`: free, paid
- `PLAN_NAME`: "Educators Free", "Parents Free", etc.
- `PLAN_ID`: pln_free-plan-dhnb0ejd, etc.

**Educator Fields:**
- `EDUCATOR_ROLE`: Principal, Teacher, Admin
- `EDUCATOR_NO_CLASSES`: Number of classes
- `EDUCATOR_NO_KIDS`: Number of students
- `SCHOOL_NAME`, `SCHOOL_CITY`, `SCHOOL_COUNTRY`
- `SCHOOL_LATITUDE`, `SCHOOL_LONGITUDE`
- I wiele innych...

**Basic Info:**
- `FIRSTNAME`, `LASTNAME`, `PHONE`
- `LANGUAGE_PREF`: pl, en
- `REGISTRATION_DATE`, `LAST_SYNC`

## Tworzenie Dynamicznych Segmentów w Brevo Dashboard

### 1. Segmenty kategorii użytkowników

**Parents All:**
```
USER_CATEGORY equals "parents"
```

**Educators Free:**
```
USER_CATEGORY equals "educators" AND PLAN_TYPE equals "free"
```

**Educators Paid:**
```
USER_CATEGORY equals "educators" AND PLAN_TYPE equals "paid"
```

**Therapists All:**
```
USER_CATEGORY equals "therapists"
```

### 2. Segmenty planów konkretnych

**School Bundle Users:**
```
PLAN_ID equals "pln_educators-school-bundle-monthly-jqo20xap"
```

**Single Classroom Users:**
```
PLAN_ID equals "pln_educators-single-classroom-monthly-lkhq021n"
```

### 3. Segmenty geograficzne

**Polish Users:**
```
LANGUAGE_PREF equals "pl"
```

**Warsaw Schools:**
```
SCHOOL_CITY equals "Warsaw"
```

**European Schools:**
```
SCHOOL_COUNTRY contains "Poland" OR SCHOOL_COUNTRY contains "Germany"
```

### 4. Segmenty rozmiarowe szkół

**Large Schools (100+ students):**
```
EDUCATOR_NO_KIDS greater than 100
```

**Small Schools (< 50 students):**
```
EDUCATOR_NO_KIDS less than 50
```

**Principals Only:**
```
EDUCATOR_ROLE equals "Principal"
```

### 5. Segmenty czasowe

**Recent Registrations (last 30 days):**
```
REGISTRATION_DATE after "2025-01-01"
```

**Active Users (synced recently):**
```
LAST_SYNC after "2025-01-15"
```

## Przykłady Zaawansowanej Segmentacji

### Large Polish Schools with Paid Plans:
```
USER_CATEGORY equals "educators" 
AND PLAN_TYPE equals "paid" 
AND LANGUAGE_PREF equals "pl" 
AND EDUCATOR_NO_KIDS greater than 100
```

### Free Trial Conversion Targeting:
```
USER_CATEGORY equals "educators" 
AND PLAN_TYPE equals "free" 
AND REGISTRATION_DATE after "2025-01-01"
AND EDUCATOR_NO_KIDS greater than 20
```

### Regional Campaign - Warsaw Educators:
```
USER_CATEGORY equals "educators" 
AND SCHOOL_CITY equals "Warsaw"
AND EDUCATOR_ROLE contains "Teacher"
```

## Instrukcje Krok po Krok

### W Brevo Dashboard:

1. **Przejdź do Contacts → Segments**
2. **Kliknij "Create a segment"**
3. **Wybierz "Create from scratch"**
4. **Ustaw filtry używając atrybutów kontaktów**
5. **Nazwij segment opisowo** (np. "Educators Free PL")
6. **Zapisz segment**

### Automatyczne Aktualizacje:
- Segmenty są **dynamiczne** - aktualizują się automatycznie
- Nowi użytkownicy automatycznie trafią do odpowiednich segmentów
- Zmiany planów automatycznie zaktualizują przynależność do segmentów

## Email Campaign Targeting

### Używanie Segmentów w Kampaniach:
1. Utwórz email campaign w Brevo
2. W sekcji "Recipients" wybierz swój dynamiczny segment
3. Użyj atrybutów w email templates: `{{params.SCHOOL_NAME}}`, `{{params.EDUCATOR_ROLE}}`

### Przykład Template Variables:
```
Cześć {{params.FIRSTNAME}}!

Jako {{params.EDUCATOR_ROLE}} w {{params.SCHOOL_NAME}} 
z {{params.EDUCATOR_NO_KIDS}} uczniami, 
mamy dla Ciebie specjalną ofertę...
```

## Korzyści Nowej Architektury

✅ **Elastyczność**: Nowe segmenty bez zmian w kodzie
✅ **Skalowalność**: Nieograniczona liczba kombinacji filtrów  
✅ **Personalizacja**: Bogate dane do targetowania
✅ **Automatyzacja**: Dynamiczne aktualizacje segmentów
✅ **Zgodność z Brevo**: Używamy platform zgodnie z best practices

## Monitorowanie

- **Sprawdzaj rozmiary segmentów** regularnie
- **Testuj nowe filtry** na małych grupach
- **Monitoruj performance** email campaigns per segment
- **Aktualizuj segmenty** gdy pojawiają się nowe atrybuty 