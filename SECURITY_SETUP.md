# 🔒 Security Setup Guide

## Environment Variables Required

### Webhook Security
```bash
# Required for Memberstack webhook signature verification
MEMBERSTACK_WEBHOOK_SECRET=your_webhook_secret_from_memberstack_dashboard

# How to get this secret:
# 1. Go to Memberstack Dashboard → Settings → Webhooks
# 2. Find your webhook endpoint
# 3. Copy the signing secret
# 4. Add to Vercel → Project Settings → Environment Variables
```

## Setup Instructions

### 1. Webhook Signature Verification ✅ COMPLETED
- **Files Modified:**
  - `utils/memberstack-utils.js` - Added HMAC signature verification
  - `api/memberstack-webhook.js` - Updated to use new validation
- **Environment Variable:** `MEMBERSTACK_WEBHOOK_SECRET`
- **Status:** ✅ Implemented with fallback for development

### 2. CORS Policy ✅ COMPLETED
- **Files Modified:**
  - `utils/api-utils.js` - Added secure origin validation with fallback
  - `vercel.json` - Removed global CORS headers
  - All API endpoints - Updated to use secure CORS function
- **Status:** ✅ Implemented with whitelisted origins

### 3. Rate Limiting ✅ COMPLETED
- **Files Created:**
  - `utils/simple-rate-limiter.js` - In-memory rate limiter with auto-cleanup
- **Files Modified:**
  - All API endpoints - Added rate limiting with custom limits
- **Status:** ✅ Implemented with endpoint-specific limits

## Testing

### Webhook Validation
```bash
# Test with valid webhook (should work)
curl -X POST https://your-app.vercel.app/api/memberstack-webhook \
  -H "Content-Type: application/json" \
  -H "User-Agent: Memberstack-Webhook" \
  -H "X-Memberstack-Signature: sha256=valid_signature" \
  -d '{"type": "member.created", "data": {"member": {"id": "test"}}}'

# Test with invalid signature (should fail)
curl -X POST https://your-app.vercel.app/api/memberstack-webhook \
  -H "Content-Type: application/json" \
  -H "User-Agent: Memberstack-Webhook" \
  -H "X-Memberstack-Signature: sha256=invalid_signature" \
  -d '{"type": "member.created", "data": {"member": {"id": "test"}}}'
```

## ✅ TYDZIEŃ 1 COMPLETED - KRYTYCZNE ZAGROŻENIA

### 🎉 Wszystkie 3 krytyczne punkty wdrożone:
1. ✅ **Webhook Signature Verification** - HMAC validation with fallback
2. ✅ **CORS Policy** - Whitelisted origins with security headers  
3. ✅ **Rate Limiting** - Endpoint-specific limits with graceful degradation

### 📋 Manual Configuration Required:
```bash
# Add to Vercel → Environment Variables:
MEMBERSTACK_WEBHOOK_SECRET=your_webhook_secret_from_memberstack_dashboard
```

### 🔧 Rate Limiting Configuration:
- **upload-audio**: 10 requests/minute
- **combine-audio**: 3 requests/5 minutes  
- **send-email**: 5 requests/minute
- **memberstack-webhook**: 20 requests/minute
- **All others**: 60 requests/minute

## Next Steps - TYDZIEŃ 2: WYSOKIE RYZYKO

4. **Audio File Validation** (Next development step)
5. **Secure Logging** (Next development step)
6. **SQL Injection Prevention** (Next development step)