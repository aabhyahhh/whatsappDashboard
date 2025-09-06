# Aadhaar Button Template Fix

## Problem
When users clicked the "Yes, I'll very Aadhar" quick reply button in WhatsApp (note the typo "very" instead of "verify"), the system was sending a text message instead of the proper template `reply_to_yes_to_aadhar_verification_util`.

## Root Cause
The button response handler in `server/routes/metaWebhook.ts` was using `sendTextMessage()` instead of `sendTemplateMessage()` for the Aadhaar verification confirmation.

## Solution Implemented

### 1. **Fixed Button Response Handler**
Updated the `handleButtonResponse` function in `server/routes/metaWebhook.ts` to send the template message and handle the typo in button text:

```typescript
// BEFORE (incorrect)
const visualConfirmationText = `✅ *Aadhaar Verification Successful!*...`;
await sendTextMessage(from, visualConfirmationText);

// AFTER (correct)
try {
  await sendTemplateMessage(from, 'reply_to_yes_to_aadhar_verification_util');
  console.log('✅ Sent Aadhaar verification template message');
} catch (templateError) {
  console.log('⚠️ Template failed, sending text message fallback');
  const visualConfirmationText = `✅ *Aadhaar Verification Successful!*...`;
  await sendTextMessage(from, visualConfirmationText);
  console.log('✅ Sent Aadhaar verification text message fallback');
}
```

### 2. **Enhanced Button Text Detection**
Updated all webhook handlers to detect the typo in button text:

```typescript
// Handle multiple button text variations including the typo
if (id === 'yes_verify_aadhar' || 
    title === 'Yes, I will verify Aadhar' || 
    title === "Yes, I'll verify Aadhar" ||
    title === "Yes, I'll very Aadhar" ||  // Handle typo
    title === 'Yes, I will verify Aadhaar' ||
    title === "Yes, I'll verify Aadhaar" ||
    (title && /yes.*verify.*aadha?r/i.test(title))) {
```

### 3. **Updated Message Database Entry**
Updated the message saving logic to reflect that a template was sent:

```typescript
await Message.create({
  from: process.env.META_PHONE_NUMBER_ID,
  to: from,
  body: "Aadhaar verification confirmation sent",
  direction: 'outbound',
  timestamp: new Date(),
  meta: {
    type: 'aadhaar_verification_button_confirmation',
    template: 'reply_to_yes_to_aadhar_verification_util', // Added template reference
    vendorPhone: from,
    verificationDate: new Date(),
    trigger: 'button_click'
  }
});
```

### 4. **Added Fallback Mechanism**
Implemented a fallback mechanism that sends a text message if the template fails to send, ensuring users always receive confirmation.

## Files Modified

1. **`server/routes/metaWebhook.ts`**
   - Updated `handleButtonResponse` function
   - Changed from text message to template message
   - Added support for typo in button text
   - Added fallback mechanism
   - Updated database message entry

2. **`server/routes/conversationRouter.ts`**
   - Updated button detection to handle typo
   - Enhanced button text matching

3. **`server/routes/conversationEngine.ts`**
   - Updated button detection to handle typo
   - Enhanced button text matching

4. **`scripts/test-aadhaar-button-fix.ts`** (new)
   - Created test script to verify the fix
   - Simulates button click with proper webhook payload
   - Tests with the typo version: "Yes, I'll very Aadhar"

5. **`package.json`**
   - Added test script: `npm run test:aadhaar-button-fix`

## Expected Behavior

### Before Fix
- ❌ Text message sent instead of template
- ❌ Inconsistent user experience
- ❌ Template not being utilized

### After Fix
- ✅ Template `reply_to_yes_to_aadhar_verification_util` is sent
- ✅ Consistent user experience with proper template formatting
- ✅ Fallback text message if template fails
- ✅ Proper database logging with template reference

## Testing

### Test Script
```bash
npm run test:aadhaar-button-fix
```

### Test Cases
1. **Button Click Simulation**: Simulates the exact webhook payload for button click
2. **Template Verification**: Confirms template is sent instead of text
3. **Database Verification**: Checks if message is properly logged
4. **Fallback Testing**: Verifies fallback mechanism works

### Manual Testing
1. Send loan request to get Aadhaar verification template
2. Click "Yes, I'll very Aadhar" button (note the typo)
3. Verify that template `reply_to_yes_to_aadhar_verification_util` is received
4. Check admin dashboard for proper tick mark display

## Flow Summary

1. **User sends loan request** → System sends `reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util` template
2. **User clicks "Yes, I'll very Aadhar" button** → System processes button response (handles typo)
3. **System updates database** → Sets `aadharVerified = true` and `aadharVerificationDate`
4. **System sends confirmation** → Sends `reply_to_yes_to_aadhar_verification_util` template
5. **Admin dashboard updates** → Shows tick mark in Loan Reply Log

## Verification

The fix ensures that:
- ✅ Button responses trigger template messages
- ✅ Template `reply_to_yes_to_aadhar_verification_util` is sent
- ✅ Database is properly updated
- ✅ Admin dashboard shows verification status
- ✅ Fallback mechanism works if template fails
- ✅ Consistent user experience across all interaction methods
