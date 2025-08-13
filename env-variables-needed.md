# Environment Variables Needed for Local Development

Żeby mogę lokalnie testować API calls i debugować bez deployowania na Vercel, potrzebuję tych zmiennych środowiskowych:

## 🔑 **Główne API Keys:**

```bash
# Webflow API - do pobierania danych z CMS
WEBFLOW_API_TOKEN=
WEBFLOW_SITE_ID=

# Webflow Webhooks - do walidacji sygnatur webhook
WEBFLOW_CLIENT_SECRET=

# Supabase - do operacji na bazie danych (LMID, ShareID)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Memberstack - do autentyfikacji użytkowników
MEMBERSTACK_SECRET_KEY=

# Brevo - do wysyłania emaili
BREVO_API_KEY=
```

## 📝 **Jak używać:**

1. Skopiuj wartości z Vercel Dashboard → Settings → Environment Variables
2. Stwórz plik `.env.local` w root projektu
3. Wklej zmienne (plik jest w .gitignore, nie zostanie pushowany)
4. Wtedy mogę lokalnie uruchamiać testy API bez deployowania

## 🚀 **Korzyści:**

- ✅ Szybsze debugowanie API calls
- ✅ Testowanie mapowania pól Webflow lokalnie  
- ✅ Sprawdzanie Supabase queries bez Vercel logs
- ✅ Natychmiastowe feedback zamiast czekania na deploy

## 🔒 **Bezpieczeństwo:**

- `.env.local` jest w .gitignore
- Nigdy nie pushujemy kluczy na GitHub
- Używamy tylko do lokalnego developmentu

Możesz po prostu skopiować wartości z Vercel i wkleić tutaj - będę mógł znacznie szybciej debugować! 🎯
