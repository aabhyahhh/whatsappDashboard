# Button Type and Phone Format Fix

## Problem Analysis

### 1. **Button Type Handling Issue**
The webhook handlers were only processing `type: "interactive"` events but not `type: "button"` events. In the logs, inbound messages showed:
- `type: 'button'`
- `hasInteractive: false`
- `hasButton: true`

This meant that `handleButtonClick()` and `handleButtonResponse()` functions were never reached for `type: "button"` events.

### 2. **Phone Format Inconsistency**
The LoanReplyLog was storing `contactNumber` in E.164 format (e.g., `+91813...`), but some updates in `metaWebhook.ts` were using the raw `from` value without the `+` prefix, causing `findOneAndUpdate` operations to fail and preventing the green tick from appearing.

## Solution Implemented

### 1. **Fixed Button Type Handling**

#### **metaWebhook.ts - processIncomingMessage()**
```typescript
// Handle button clicks for both interactive and button types
if ((type === 'interactive' && (button || interactive?.button_reply)) || type === 'button') {
  const btn = type === 'interactive' && interactive?.button_reply
    ? { id: interactive.button_reply.id, title: interactive.button_reply.title }
    : { id: button.id, title: button.title || button.text };

  await handleButtonResponse(from, btn);
}
```

#### **conversationRouter.ts - processInboundMessage()**
```typescript
// Handle button clicks for both interactive and button types
const hasInteractiveBtn = type === 'interactive' && interactive?.button_reply;
const hasLegacyBtn = type === 'button' && button;

if (hasInteractiveBtn || hasLegacyBtn) {
  const btn = hasInteractiveBtn
    ? { id: interactive.button_reply.id, title: interactive.button_reply.title }
    : { id: button.id, title: button.title || button.text }; // some payloads use .text

  console.log(`🔘 Button click from ${fromE164}: ${btn.id} - ${btn.title}`);
  await handleButtonClick(fromWaId, fromE164, btn);
}
```

### 2. **Fixed Phone Format Consistency**

#### **Added Phone Number Normalizer**
```typescript
// Phone number normalizer to ensure E.164 format
const toE164 = (waId: string) => (waId.startsWith('+') ? waId : `+${waId}`);
```

#### **Updated All Phone Number Usage**
- **Contact Updates**: Now use `phoneE164` consistently
- **LoanReplyLog Creation**: Use `phoneE164` for `contactNumber` field
- **LoanReplyLog Updates**: Use `phoneE164` for `findOneAndUpdate` operations
- **User Lookups**: Maintain compatibility with both formats

### 3. **Enhanced Button Text Detection**
Updated all webhook handlers to detect the typo in button text:
```typescript
if (id === 'yes_verify_aadhar' || 
    title === 'Yes, I will verify Aadhar' || 
    title === "Yes, I'll verify Aadhar" ||
    title === "Yes, I'll very Aadhar" ||  // Handle typo
    title === 'Yes, I will verify Aadhaar' ||
    title === "Yes, I'll verify Aadhaar" ||
    (title && /yes.*verify.*aadha?r/i.test(title))) {
```

## Files Modified

### 1. **server/routes/metaWebhook.ts**
- ✅ Added `toE164()` phone number normalizer
- ✅ Updated `processIncomingMessage()` to handle both button types
- ✅ Updated contact updates to use normalized phone numbers
- ✅ Updated LoanReplyLog creation to use E.164 format
- ✅ Updated LoanReplyLog updates to use E.164 format
- ✅ Enhanced button text detection for typo handling

### 2. **server/routes/conversationRouter.ts**
- ✅ Updated `processInboundMessage()` to handle both button types
- ✅ Enhanced button text detection for typo handling

### 3. **server/routes/conversationEngine.ts**
- ✅ Enhanced button text detection for typo handling

### 4. **scripts/test-aadhaar-button-fix.ts**
- ✅ Updated to test `type: "button"` format
- ✅ Fixed crypto import issues
- ✅ Updated webhook URL to correct port

## Testing

### Test Script
```bash
npm run test:aadhaar-button-fix
```

### Test Results
- ✅ `type: "button"` events are now properly handled
- ✅ Phone number format consistency maintained
- ✅ LoanReplyLog updates work correctly
- ✅ Button text typo detection works
- ✅ Template messages are sent correctly

## Expected Behavior

### Before Fix
- ❌ `type: "button"` events ignored
- ❌ Phone format mismatch prevented LoanReplyLog updates
- ❌ Green tick mark never appeared
- ❌ Template messages not sent for button clicks

### After Fix
- ✅ Both `type: "button"` and `type: "interactive"` events handled
- ✅ Consistent E.164 phone number format throughout
- ✅ LoanReplyLog updates work correctly
- ✅ Green tick mark appears after button click
- ✅ Template `reply_to_yes_to_aadhar_verification_util` sent correctly
- ✅ Handles button text typo: "Yes, I'll very Aadhar"

## Flow Summary

1. **User sends loan request** → System sends `reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util` template
2. **User clicks "Yes, I'll very Aadhar" button** → System processes both `type: "button"` and `type: "interactive"` events
3. **System updates database** → Uses consistent E.164 phone format for all operations
4. **System sends confirmation** → Sends `reply_to_yes_to_aadhar_verification_util` template
5. **Admin dashboard updates** → Shows tick mark in Loan Reply Log

## Key Benefits

1. **Robust Button Handling**: Supports both Meta API button event formats
2. **Data Consistency**: E.164 phone format ensures reliable database operations
3. **Typo Tolerance**: Handles button text variations including typos
4. **Non-Breaking**: Existing functionality preserved, only enhanced
5. **Clean Codebase**: Minimal changes with maximum impact

## Verification

The fix ensures that:
- ✅ Button events of any type are properly processed
- ✅ Phone numbers are consistently formatted as E.164
- ✅ LoanReplyLog entries are created and updated correctly
- ✅ Admin dashboard shows verification status accurately
- ✅ Template messages are sent for all button interactions
- ✅ System handles button text variations gracefully
