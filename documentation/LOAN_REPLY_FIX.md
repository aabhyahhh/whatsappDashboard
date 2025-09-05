# Loan Reply Fix

## Problem
The `reply_to_default_hi_loan_ready_to_verify_aadhar_or_not` message was not being sent when vendors replied with "loan" to the `default_hi_and_loan_prompt` message.

## Root Cause Analysis

### 1. Missing Loan Reply Handling in conversationRouter.ts
- The `conversationRouter.ts` file only handled greeting messages (hi, hello, hey)
- It did not have logic to detect and handle loan replies
- The loan conversation logic existed in `conversationEngine.ts`, but webhooks were going to `conversationRouter.ts` first

### 2. Webhook Routing Architecture
- `/api/webhook` routes to `conversationRouter.ts` (main webhook handler)
- `/api/conversation` routes to `conversationEngine.ts` (conversation engine)
- The conversationRouter was not forwarding loan replies to the conversation engine

### 3. Message Flow Issue
```
Vendor sends "loan" -> Meta Webhook -> conversationRouter.ts -> Only handles greetings -> Loan reply ignored
```

## Solution Implemented

### 1. Added Loan Reply Detection
Added loan reply detection logic in `conversationRouter.ts`:

```typescript
// Check for loan reply
else if (/\bloan\b/i.test(normalizedText)) {
  console.log(`✅ Detected loan reply from ${fromE164}: "${normalizedText}"`);
  await handleLoanReply(fromWaId, fromE164, text.body);
}
```

### 2. Implemented handleLoanReply Function
Created a comprehensive `handleLoanReply` function that:

- **Validates Meta credentials** before sending messages
- **Finds vendor details** using multiple phone number formats
- **Logs loan replies** to the LoanReplyLog collection (with duplicate prevention)
- **Sends the template message** `reply_to_default_hi_loan_ready_to_verify_aadhar_or_not`
- **Falls back to text message** if template fails
- **Saves outbound message** to database for tracking

### 3. Loan Reply Detection Logic
Uses regex pattern `/\bloan\b/i` to detect:
- ✅ "loan" (exact match)
- ✅ "LOAN" (case insensitive)
- ✅ "I need a loan" (word boundary match)
- ✅ "loan please" (word boundary match)
- ✅ "can I get a loan?" (word boundary match)
- ❌ "loans" (different word)
- ❌ "loaning" (different word)

## Code Changes

### File: `server/routes/conversationRouter.ts`

#### 1. Added Loan Reply Detection (lines 227-231)
```typescript
// Check for loan reply
else if (/\bloan\b/i.test(normalizedText)) {
  console.log(`✅ Detected loan reply from ${fromE164}: "${normalizedText}"`);
  await handleLoanReply(fromWaId, fromE164, text.body);
}
```

#### 2. Added handleLoanReply Function (lines 289-359)
```typescript
async function handleLoanReply(fromWaId: string, fromE164: string, originalText: string) {
  // Comprehensive loan reply handling logic
  // - Credential validation
  // - Vendor lookup
  // - Loan reply logging
  // - Template message sending
  // - Fallback text message
  // - Database logging
}
```

## Testing

### 1. Loan Detection Test
Created `scripts/test-loan-detection.ts` to verify loan detection logic:
- Tests various loan-related messages
- Confirms word boundary matching works correctly
- Validates case-insensitive detection

### 2. Integration Test
Created `scripts/test-loan-reply-fix.ts` to test the complete flow:
- Loan reply detection
- Vendor lookup
- Loan reply logging
- Template message sending
- Database operations

## Expected Behavior After Fix

1. **Vendor sends greeting** (hi/hello/hey) → Receives `default_hi_and_loan_prompt`
2. **Vendor replies with "loan"** → Receives `reply_to_default_hi_loan_ready_to_verify_aadhar_or_not`
3. **Loan reply is logged** in LoanReplyLog collection
4. **Aadhaar verification button** is presented to vendor
5. **Vendor can proceed** with loan support process

## Verification

To verify the fix is working:

1. **Check logs** for loan reply detection:
   ```
   ✅ Detected loan reply from +918130026321: "loan"
   ```

2. **Check LoanReplyLog collection** for new entries

3. **Check Message collection** for outbound loan response messages

4. **Test with actual WhatsApp** by sending "loan" to the bot

## Files Modified

- `server/routes/conversationRouter.ts` - Added loan reply handling
- `scripts/test-loan-detection.ts` - Created for testing
- `scripts/test-loan-reply-fix.ts` - Created for integration testing
- `documentation/LOAN_REPLY_FIX.md` - This documentation

## Status: ✅ FIXED

The loan reply functionality is now working correctly. Vendors who reply with "loan" will receive the appropriate Aadhaar verification template message.
