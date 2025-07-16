# 🧪 Rate Limiter Testing Guide

## Testing Rate Limiting Implementation

### Test 1: Basic Rate Limiting
```bash
# Test normal usage (should work)
curl -X POST https://your-app.vercel.app/api/upload-audio \
  -H "Content-Type: application/json" \
  -d '{"audioData": "test", "filename": "test.mp3", "world": "spookyland", "lmid": "123", "questionId": "1", "lang": "en"}'

# Should return 200 with rate limit headers:
# X-RateLimit-Limit: 10
# X-RateLimit-Remaining: 9
# X-RateLimit-Reset: [timestamp]
```

### Test 2: Rate Limit Exceeded
```bash
# Send 11 requests quickly to upload-audio (limit: 10/minute)
for i in {1..11}; do
  curl -X POST https://your-app.vercel.app/api/upload-audio \
    -H "Content-Type: application/json" \
    -d '{"audioData": "test", "filename": "test.mp3", "world": "spookyland", "lmid": "123", "questionId": "1", "lang": "en"}'
  echo "Request $i"
done

# Requests 1-10 should return 200
# Request 11 should return 429:
# {
#   "error": "Rate limit exceeded",
#   "retryAfter": 60,
#   "message": "Too many requests. Please try again in 60 seconds."
# }
```

### Test 3: Different Endpoints Have Different Limits
```bash
# Test combine-audio (limit: 3/5 minutes)
curl -X POST https://your-app.vercel.app/api/combine-audio \
  -H "Content-Type: application/json" \
  -d '{"world": "spookyland", "lmid": "123", "audioSegments": []}'

# Test get-radio-data (limit: 60/minute)
curl -X GET https://your-app.vercel.app/api/get-radio-data?shareId=test123
```

### Test 4: Different IPs Are Independent
```bash
# Test from different IPs using proxy
curl --proxy socks5://proxy1:1080 -X POST https://your-app.vercel.app/api/upload-audio \
  -H "Content-Type: application/json" \
  -d '{"audioData": "test", "filename": "test.mp3", "world": "spookyland", "lmid": "123", "questionId": "1", "lang": "en"}'

curl --proxy socks5://proxy2:1080 -X POST https://your-app.vercel.app/api/upload-audio \
  -H "Content-Type: application/json" \
  -d '{"audioData": "test", "filename": "test.mp3", "world": "spookyland", "lmid": "123", "questionId": "1", "lang": "en"}'

# Both should work independently
```

### Test 5: Rate Limit Recovery
```bash
# After hitting rate limit, wait for window to reset
sleep 60

# Then test again - should work
curl -X POST https://your-app.vercel.app/api/upload-audio \
  -H "Content-Type: application/json" \
  -d '{"audioData": "test", "filename": "test.mp3", "world": "spookyland", "lmid": "123", "questionId": "1", "lang": "en"}'
```

## Expected Rate Limits

| Endpoint | Limit | Window | Reason |
|----------|-------|--------|---------|
| upload-audio | 10 | 1 minute | Expensive operation |
| combine-audio | 3 | 5 minutes | Very expensive FFmpeg |
| send-email | 5 | 1 minute | Abuse prevention |
| memberstack-webhook | 20 | 1 minute | Webhook protection |
| delete-audio | 60 | 1 minute | Standard limit |
| list-recordings | 60 | 1 minute | Standard limit |
| get-radio-data | 60 | 1 minute | Standard limit |
| get-share-link | 60 | 1 minute | Standard limit |
| lmid-operations | 60 | 1 minute | Standard limit |

## Monitoring Rate Limits

### Check Rate Limit Headers
```javascript
// In browser console after API call
const response = await fetch('/api/upload-audio', {
  method: 'POST',
  body: JSON.stringify({...}),
  headers: {'Content-Type': 'application/json'}
});

console.log('Rate Limit:', response.headers.get('X-RateLimit-Limit'));
console.log('Remaining:', response.headers.get('X-RateLimit-Remaining'));
console.log('Reset:', response.headers.get('X-RateLimit-Reset'));
```

### Server-side Monitoring
```javascript
// Check logs for rate limit warnings
grep "Rate limit exceeded" /var/log/app.log

// Rate limiter cleanup logs
grep "Rate limiter cleanup" /var/log/app.log
```

## Troubleshooting

### False Positives
- **Symptom**: Legitimate users getting 429 errors
- **Solution**: Increase limits or check IP detection logic

### Memory Usage
- **Symptom**: High memory usage on server
- **Solution**: Rate limiter automatically cleans up old records every 5 minutes

### Load Balancing
- **Symptom**: Inconsistent rate limiting with multiple servers
- **Solution**: Each server has independent rate limiting (by design for simplicity)

### Development Mode
- **Symptom**: Rate limiting during development
- **Solution**: Temporarily increase limits in development environment

## Production Deployment

### Before Deployment
1. Test all endpoints with expected traffic patterns
2. Monitor memory usage during peak times
3. Set up alerts for excessive 429 responses
4. Document rate limits for API users

### After Deployment
1. Monitor rate limit statistics
2. Adjust limits based on actual usage patterns
3. Set up automated alerts for abuse patterns
4. Review rate limit logs weekly