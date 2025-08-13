# Webhook Response Troubleshooting Guide

## Problem
Users are sending "hi" messages to Laari Khojo but not receiving any responses. The webhook is receiving messages but not sending replies.

## Root Cause Analysis

### 1. **Twilio Client Issues**
- Missing or invalid Twilio credentials
- Twilio client not properly initialized
- Environment variables not set correctly

### 2. **Webhook Configuration Issues**
- Webhook URL not properly configured in Twilio
- Webhook endpoint not accessible
- Incorrect HTTP method or content type

### 3. **Message Processing Issues**
- Greeting detection logic not working
- Template message sending failing
- Database connection issues

### 4. **Template Message Issues**
- Invalid template SID
- Template not approved by WhatsApp
- Messaging service not configured

## Diagnostic Steps

### Step 1: Check Environment Variables
```bash
# Check if these environment variables are set
echo "TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}"
echo "TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}"
echo "TWILIO_PHONE_NUMBER: ${TWILIO_PHONE_NUMBER}"
echo "TWILIO_MESSAGING_SERVICE_SID: ${TWILIO_MESSAGING_SERVICE_SID}"
```

### Step 2: Test Webhook Response
```bash
npm run test:webhook-response
```

This will test:
- ✅ Webhook endpoint accessibility
- ✅ Message processing
- ✅ Twilio client functionality
- ✅ Database message storage

### Step 3: Check Server Logs
Look for these log messages in your server output:

#### Successful Processing
```
✅ Twilio client initialized successfully
✅ Triggered outbound template message HX46464a13f80adebb4b9d552d63acfae9 in response to greeting
✅ Outbound template message saved to DB
```

#### Error Messages
```
❌ Twilio client not initialized - missing credentials
❌ Failed to send outbound template message
⚠️ Twilio client not initialized, cannot send outbound template message
```

### Step 4: Verify Twilio Configuration

#### Check Twilio Console
1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Messaging** → **Settings** → **WhatsApp Sandbox**
3. Verify your webhook URL is correct
4. Check if the phone number is properly configured

#### Check Template Messages
1. Go to **Messaging** → **Content Editor**
2. Verify these templates exist and are approved:
   - **Greeting Template**: `HX46464a13f80adebb4b9d552d63acfae9`
   - **Loan Template**: `HXcdbf14c73f068958f96efc216961834d`

## Common Issues and Solutions

### Issue 1: Twilio Client Not Initialized
**Symptoms**: `❌ Twilio client not initialized - missing credentials`

**Solution**:
```bash
# Set environment variables
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="your_auth_token_here"
export TWILIO_PHONE_NUMBER="whatsapp:+1234567890"
export TWILIO_MESSAGING_SERVICE_SID="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Issue 2: Invalid Template SID
**Symptoms**: `❌ Failed to send outbound template message`

**Solution**:
1. Check Twilio Console for correct template SIDs
2. Verify templates are approved by WhatsApp
3. Update template SIDs in webhook.js if needed

### Issue 3: Webhook Not Receiving Messages
**Symptoms**: No webhook logs when sending messages

**Solution**:
1. Verify webhook URL in Twilio Console
2. Check if server is running and accessible
3. Test webhook endpoint manually

### Issue 4: Database Connection Issues
**Symptoms**: Messages not being saved to database

**Solution**:
1. Check MongoDB connection string
2. Verify database is running
3. Check database permissions

## Testing Commands

### Test Webhook Endpoint
```bash
# Test if webhook is accessible
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+919265466535&To=whatsapp:+1234567890&Body=hi"
```

### Test Twilio Client
```bash
# Run the webhook response test
npm run test:webhook-response
```

### Check Recent Messages
```bash
# Check if messages are being saved
curl http://localhost:3000/api/messages
```

## Debugging Steps

### 1. Enable Detailed Logging
Add these console.log statements to webhook.js:

```javascript
// At the start of webhook handler
console.log('🔍 Webhook received:', {
  From: req.body.From,
  To: req.body.To,
  Body: req.body.Body,
  hasClient: !!client
});

// Before sending template message
console.log('📤 Attempting to send template message:', {
  from: msgPayload.from,
  to: msgPayload.to,
  contentSid: msgPayload.contentSid
});
```

### 2. Check Template Message Content
Verify the template message content in webhook.js:

```javascript
// Greeting template content
"👋 Namaste from Laari Khojo!\n🙏 लारी खोजो की ओर से नमस्ते!\n\n📩 Thanks for reaching out!\n📞 संपर्क करने के लिए धन्यवाद!\n\nWe help you get discovered by more customers by showing your updates and services on our platform.\n🧺 हम आपके अपडेट्स और सेवाओं को अपने प्लेटफॉर्म पर दिखाकर आपको ज़्यादा ग्राहकों तक पहुँचाने में मदद करते हैं।\n\n💰 Interested in future loan support?\nJust reply with: *loan*\nभविष्य में लोन सहायता चाहिए?\n➡️ जवाब में भेजें: *loan*\n\nYou can also visit our 🌐 website using the button below.\nआप नीचे दिए गए बटन से हमारी 🌐 वेबसाइट पर भी जा सकते हैं।\n\n🚀 Let's grow your laari together!\n🌟 आइए मिलकर आपकी लारी को आगे बढ़ाएं!"
```

### 3. Verify Greeting Detection
The greeting detection regex should match:
- `hi`, `hii`, `hiii`, etc.
- `hello`, `helloo`, `hellooo`, etc.
- `hey`, `heyy`, `heyyy`, etc.

## Quick Fix Checklist

- [ ] **Environment Variables**: All Twilio credentials set correctly
- [ ] **Twilio Client**: Client initializes without errors
- [ ] **Webhook URL**: Correctly configured in Twilio Console
- [ ] **Template SIDs**: Valid and approved template SIDs
- [ ] **Database**: Messages being saved successfully
- [ ] **Server Logs**: No error messages in webhook processing
- [ ] **Network**: Webhook endpoint accessible from Twilio

## Monitoring

### Key Logs to Watch
```
✅ Twilio client initialized successfully
✅ Triggered outbound template message
✅ Outbound template message saved to DB
⚠️ Greeting response already sent recently, skipping duplicate
❌ Failed to send outbound template message
❌ Twilio client not initialized
```

### Metrics to Track
- Number of incoming messages
- Number of outbound responses sent
- Template message delivery success rate
- Webhook response times

## Next Steps

1. **Run the diagnostic test**: `npm run test:webhook-response`
2. **Check server logs** for error messages
3. **Verify Twilio configuration** in console
4. **Test with a simple message** to isolate the issue
5. **Check database** for message storage

If the issue persists, the logs from the diagnostic test will help identify the specific problem area.
