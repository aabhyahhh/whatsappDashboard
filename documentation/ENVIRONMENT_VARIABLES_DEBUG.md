# Environment Variables Debug Guide

## Issue
The webhook is returning 502 errors and Meta credentials are not being loaded properly in production, even though they are set in the Render dashboard.

## Root Cause Analysis
The issue is likely one of the following:
1. Environment variables are not being loaded at runtime
2. The webhook signature verification is failing
3. The Meta API calls are timing out

## Debug Steps

### 1. Check Environment Variables
Visit the debug endpoint to see if environment variables are loaded:
```
GET https://whatsappdashboard-1.onrender.com/api/debug/env
```

Expected response:
```json
{
  "NODE_ENV": "production",
  "META_ACCESS_TOKEN": "SET",
  "META_PHONE_NUMBER_ID": "123456789012345",
  "META_VERIFY_TOKEN": "your_verify_token",
  "META_APP_SECRET": "SET",
  "RELAY_SECRET": "SET",
  "MONGODB_URI": "SET",
  "JWT_SECRET": "SET"
}
```

### 2. Check Server Logs
Look for these log messages in the Render logs:
- `🔍 Meta WhatsApp credentials check:`
- `🔍 Runtime Meta credentials check:`
- `🔍 Conversation Router Environment Variables:`

### 3. Test Webhook Endpoint
Test the webhook verification endpoint:
```
GET https://whatsappdashboard-1.onrender.com/api/webhook?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=test_challenge
```

Expected response: `test_challenge` (plain text)

### 4. Check Meta API Credentials
Verify that your Meta WhatsApp API credentials are correct:
- Access Token: Should be a long string starting with your app ID
- Phone Number ID: Should be a numeric string
- App Secret: Should be a long string
- Verify Token: Should match what you set in Meta Developer Console

## Fixes Applied

### 1. Runtime Credential Checking
Added `areMetaCredentialsAvailable()` function that checks credentials at runtime, not just at module load time.

### 2. Better Error Handling
- Added timeout handling for webhook forwarding
- Added fallback mechanisms for template messages
- Added comprehensive error logging

### 3. Debug Endpoint
Added `/api/debug/env` endpoint to check environment variables in production.

### 4. Improved Webhook Processing
- Added proper error handling for signature verification
- Added timeout for forwarding requests
- Added fallback for template message failures

## Environment Variables Required

Make sure these are set in your Render dashboard:

```bash
# Meta WhatsApp API
META_ACCESS_TOKEN=your_access_token_here
META_PHONE_NUMBER_ID=your_phone_number_id_here
META_VERIFY_TOKEN=your_verify_token_here
META_APP_SECRET=your_app_secret_here
META_WEBHOOK_URL=https://whatsappdashboard-1.onrender.com/api/webhook

# Relay System
RELAY_SECRET=your_relay_secret_here
LK_URL=https://laari-khojo-backend.onrender.com/api/webhook
DASH_URL=https://whatsappdashboard-1.onrender.com/api/conversation

# Database
MONGODB_URI=your_mongodb_uri_here
JWT_SECRET=your_jwt_secret_here
```

## Testing Commands

### Test Environment Variables
```bash
curl https://whatsappdashboard-1.onrender.com/api/debug/env
```

### Test Webhook Verification
```bash
curl "https://whatsappdashboard-1.onrender.com/api/webhook?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=test123"
```

### Test Health Check
```bash
curl https://whatsappdashboard-1.onrender.com/api/health
```

## Next Steps

1. Check the debug endpoint to see if environment variables are loaded
2. Verify Meta credentials are correct in Render dashboard
3. Test the webhook verification endpoint
4. Check server logs for any error messages
5. Test sending a message to see if the greeting works

## Common Issues

### Issue: Environment variables show as "NOT_SET"
**Solution**: Check Render dashboard environment variables are set correctly and redeploy.

### Issue: Webhook verification fails
**Solution**: Verify META_VERIFY_TOKEN matches what you set in Meta Developer Console.

### Issue: Signature verification fails
**Solution**: Verify META_APP_SECRET is correct and matches your Meta app.

### Issue: Template messages fail
**Solution**: Check if the template `default_hi_and_loan_prompt` is approved in Meta Developer Console.
