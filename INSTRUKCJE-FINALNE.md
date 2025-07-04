# 🎯 FINALNE INSTRUKCJE - KROK PO KROKU

## ✅ CO JEST JUŻ GOTOWE (100% UKOŃCZONE)
- Wszystkie API endpointy (7 sztuk) - działają lokalnie
- Kompletny radio.js script (900+ linii kodu)
- Baza danych Supabase z ShareID
- Wszystkie testy lokalne przeszły pomyślnie
- Kod jest w GitHub i Vercel

## 🚨 CO MUSISZ ZROBIĆ RĘCZNIE (4 KROKI)

### KROK 1: Konfiguracja Environment Variables w Vercel
**Czas: 2 minuty**

1. Idź do: https://vercel.com/dashboard
2. Znajdź projekt "little-microphones"
3. Kliknij "Settings" → "Environment Variables"
4. Dodaj te 2 zmienne:

```
SUPABASE_URL = https://iassjwinjjzgnrwnnfig.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhc3Nqd2luamp6Z25yd25uZmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTMyODksImV4cCI6MjA2NTk4OTI4OX0.qTxGNA62l3Cp8E06TtdmZxwWpGqEy4glblBukkNXBTs
```

5. Kliknij "Save"
6. Poczekaj na redeploy (automatyczny)

### KROK 2: Stworzenie strony /members/radio w Webflow
**Czas: 5 minut**

1. Idź do Webflow Designer
2. Stwórz nową stronę `/members/radio`
3. Skopiuj CAŁĄ zawartość z pliku `radio-page-complete.html`
4. Wklej do HTML Embed w Webflow
5. Gotowe! (Memberstack jest już załadowany globalnie w Webflow)

### KROK 3: Konfiguracja Memberstack Webhook
**Czas: 5 minut**

1. Idź do Memberstack Dashboard
2. Settings → Webhooks
3. Dodaj nowy webhook:
   - **URL**: `https://little-microphones.vercel.app/api/handle-new-member`
   - **Event**: `member.created`
   - **Method**: `POST`
4. Zapisz webhook

### KROK 4: Test końcowy
**Czas: 5 minut**

1. Idź do rp.js (panel nauczyciela)
2. Kliknij "Get Share Link" - powinien pokazać link
3. Otwórz link w nowej karcie
4. Sprawdź czy radio się ładuje
5. Przetestuj rejestrację rodzica

## 🎉 GOTOWE!

Po wykonaniu tych 4 kroków (łącznie 17 minut) system będzie w 100% działał:
- Nauczyciele będą mogli generować linki
- Rodzice będą mogli słuchać programów
- Rejestracja będzie działać automatycznie
- Nowe LMID będą przypisywane automatycznie

## 📞 WSPARCIE
Jeśli coś nie działa, sprawdź:
1. Console w przeglądarce (F12)
2. Vercel Functions logs
3. Memberstack webhook logs

Wszystko jest gotowe - wystarczy te 4 kroki! 🚀 