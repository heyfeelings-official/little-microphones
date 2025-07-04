# Memberstack Webhook Configuration Guide

## Overview
This document provides step-by-step instructions for configuring Memberstack webhooks to integrate with the Little Microphones radio program sharing system.

## Purpose
When parents register through the radio page, the system needs to:
1. Detect the registration event
2. Extract the ShareID from registration metadata
3. Find the original world from the ShareID
4. Assign a new available LMID to the parent
5. Send confirmation email with access details

## Webhook Configuration

### 1. Access Memberstack Dashboard
- Log in to your Memberstack account
- Navigate to your project dashboard
- Go to "Settings" → "Webhooks"

### 2. Create New Webhook
- Click "Add Webhook"
- Set the following configuration:

**Webhook URL:**
```
https://little-microphones.vercel.app/api/handle-new-member
```

**Event Type:**
- Select "Member Created" or "Member Signup"
- Ensure this triggers on new member registrations

**HTTP Method:**
- POST

**Content Type:**
- application/json

### 3. Webhook Payload Structure
Memberstack will send a payload similar to this:

```json
{
  "event": "member.created",
  "data": {
    "id": "mem_1234567890",
    "email": "parent@example.com",
    "customFields": {
      "originating_share_id": "abc123def456"
    },
    "createdAt": "2025-01-15T10:30:00Z",
    "planConnections": []
  }
}
```

### 4. Metadata Configuration
Ensure the radio.js registration process includes ShareID metadata:

```javascript
memberstack.openModal('signup', {
  metadata: {
    originating_share_id: currentShareId
  }
});
```

## API Endpoint Details

### /api/handle-new-member
- **Method:** POST
- **Purpose:** Process new member registrations with ShareID assignment
- **Input:** Memberstack webhook payload
- **Output:** Success/error response

### Processing Flow
1. **Webhook Received** → Extract member data and ShareID
2. **ShareID Lookup** → Find original world and LMID from ShareID
3. **LMID Assignment** → Find next available LMID in the same world
4. **Database Update** → Create new LMID record for the parent
5. **Email Notification** → Send access details to parent (future enhancement)

## Testing the Webhook

### 1. Test Registration Flow
1. Create a test radio program link
2. Open the radio page
3. Click "Register to Record"
4. Complete the registration form
5. Verify the webhook is triggered

### 2. Verify Database Updates
Check the Supabase `lmids` table for:
- New record created with parent's email
- Same world as original ShareID
- New unique LMID assigned
- Proper timestamps

### 3. Check Logs
Monitor the Vercel function logs for:
- Webhook receipt confirmation
- ShareID processing
- LMID assignment success
- Any error messages

## Troubleshooting

### Common Issues

**Webhook Not Triggering:**
- Verify webhook URL is correct and accessible
- Check Memberstack webhook configuration
- Ensure event type is set to "Member Created"

**ShareID Not Found:**
- Verify metadata is being passed correctly from radio.js
- Check ShareID format in database
- Ensure registration modal includes metadata

**LMID Assignment Fails:**
- Check if world has available LMID slots
- Verify database permissions
- Review error logs for specific issues

**Database Connection Issues:**
- Verify Supabase environment variables
- Check API key permissions
- Test database connectivity

### Error Responses

**400 Bad Request:**
```json
{
  "error": "Invalid webhook payload",
  "details": "Missing required fields"
}
```

**404 Not Found:**
```json
{
  "error": "ShareID not found",
  "shareId": "abc123def456"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Database operation failed",
  "details": "Could not assign new LMID"
}
```

## Security Considerations

### Webhook Authentication
- Consider implementing webhook signature verification
- Use HTTPS for all webhook communications
- Validate all incoming data

### Data Protection
- Ensure ShareID data is properly sanitized
- Protect against injection attacks
- Log security events for monitoring

## Future Enhancements

### Email Notifications
- Send welcome email to new parents
- Include access instructions and world details
- Provide recording guidelines

### Admin Dashboard
- View registration statistics
- Monitor LMID assignments
- Track world usage patterns

### Advanced Features
- Automatic world capacity management
- Parent onboarding workflows
- Registration analytics

## Configuration Checklist

- [ ] Memberstack webhook URL configured
- [ ] Event type set to "Member Created"
- [ ] Webhook payload includes custom fields
- [ ] radio.js passes ShareID metadata
- [ ] Database permissions configured
- [ ] Error handling implemented
- [ ] Logging enabled for monitoring
- [ ] Test registration completed successfully

## Support

For issues with webhook configuration:
1. Check Memberstack documentation
2. Review Vercel function logs
3. Test with sample payloads
4. Contact support if needed

**Last Updated:** January 2025  
**Version:** 4.0.0  
**Status:** Production Ready ✅ 