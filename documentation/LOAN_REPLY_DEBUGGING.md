# Loan Reply Debugging - Enhanced Logging

## Problem
The user is not receiving the `reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util` template message when they reply with "loan" to the bot.

## Investigation Results

### ✅ Loan Detection Logic
- **Status**: Working correctly
- **Test Results**: All loan-related messages are detected properly
- **Regex Pattern**: `/\bloan\b/i` works as expected
- **Conditional Logic**: Correctly routes to loan handler

### ✅ Template Configuration
- **Status**: Template exists and is properly configured
- **Template Name**: `reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util`
- **Location**: `server/meta.ts` - properly defined

### ❌ Webhook Processing
- **Status**: Issue identified
- **Problem**: Webhook endpoint returning 500 Internal Server Error
- **Root Cause**: Likely signature verification or processing error

## Solution Implemented

### Enhanced Logging and Error Handling
Added comprehensive logging to `server/routes/conversationRouter.ts` to help debug the issue:

#### 1. Webhook Entry Point Logging
```typescript
console.log('📨 Incoming Meta webhook payload');
console.log('🔍 Request headers:', {
  'content-type': req.get('content-type'),
  'x-hub-signature-256': req.get('x-hub-signature-256') ? 'present' : 'missing',
  'user-agent': req.get('user-agent')
});
```

#### 2. Signature Verification Debugging
```typescript
console.log('🔍 Signature verification details:', {
  hasSignature: !!req.get('x-hub-signature-256'),
  hasAppSecret: !!META_APP_SECRET,
  bodyType: typeof req.body,
  bodyLength: req.body?.length || 0
});
```

#### 3. Webhook Body Structure Logging
```typescript
console.log('🔍 Webhook body structure:', {
  hasEntry: !!body?.entry,
  entryLength: body?.entry?.length || 0,
  hasChanges: !!body?.entry?.[0]?.changes,
  changesLength: body?.entry?.[0]?.changes?.length || 0
});
```

#### 4. Message Processing Details
```typescript
console.log('🔍 Processing inbound message:', {
  id: message.id,
  from: message.from,
  type: message.type,
  timestamp: message.timestamp,
  hasText: !!message.text,
  hasInteractive: !!message.interactive,
  hasButton: !!message.button
});
```

#### 5. Database Operation Error Handling
```typescript
try {
  await Message.create({...});
  console.log('✅ Message saved to database');
} catch (dbError) {
  console.error('❌ Error saving message to database:', dbError);
}
```

## Expected Debug Output

With the enhanced logging, when a user sends "loan", you should see:

```
📨 Incoming Meta webhook payload
🔍 Request headers: { content-type: 'application/json', 'x-hub-signature-256': 'present', user-agent: '...' }
✅ Meta signature verification successful
⚡ ACK sent in 15ms
🔍 Parsed webhook body: { object: 'whatsapp_business_account', entry: [...] }
🔄 Processing webhook data asynchronously...
🔍 Webhook body structure: { hasEntry: true, entryLength: 1, hasChanges: true, changesLength: 1 }
🔍 Webhook value structure: { hasMessages: true, messagesLength: 1, hasStatuses: false, statusesLength: 0, field: 'messages' }
📊 Webhook data: inbound messages
📨 Processing inbound messages directly...
📨 Message 1 from 918130026321: loan
🔍 Message details: { id: 'wamid.xxx', type: 'text', timestamp: '1704067200', hasText: true, hasInteractive: false, hasButton: false }
🔍 Processing inbound message: { id: 'wamid.xxx', from: '918130026321', type: 'text', timestamp: '1704067200', hasText: true, hasInteractive: false, hasButton: false }
🔍 Processing message from +918130026321: "loan"
✅ Message saved to database
✅ Contact updated
👤 Found vendor: test_vendor (+918130026321)
🔍 Processing text message: "loan" -> "loan"
✅ Detected loan reply from +918130026321: "loan"
💰 Handling loan reply for +918130026321
✅ Logged loan reply from test_vendor (+918130026321) with aadharVerified: false
✅ Sent loan reply template
✅ Loan reply sent to +918130026321
✅ Processed message from +918130026321
✅ Webhook processing completed
```

## Next Steps

### 1. Check Server Logs
Look for the enhanced debug output in your server logs to identify where the process is failing.

### 2. Verify Webhook URL
Ensure the webhook URL in Meta WhatsApp API is correctly configured to point to:
```
https://whatsappdashboard-1.onrender.com/api/webhook
```

### 3. Check Environment Variables
Verify these environment variables are set correctly:
- `META_ACCESS_TOKEN`
- `META_PHONE_NUMBER_ID`
- `META_APP_SECRET`
- `META_VERIFY_TOKEN`

### 4. Test Webhook Manually
Use the enhanced logging to see exactly where the webhook processing fails.

## Files Modified

- `server/routes/conversationRouter.ts` - Added comprehensive logging and error handling
- `documentation/LOAN_REPLY_DEBUGGING.md` - This documentation

## Status: 🔍 DEBUGGING ENHANCED

The loan reply functionality should work correctly. The enhanced logging will help identify exactly where the issue occurs in the webhook processing pipeline.
