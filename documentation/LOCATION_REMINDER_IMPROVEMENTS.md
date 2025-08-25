# Location Reminder System Improvements

## Overview
This document outlines the improvements made to the location reminder system to fix issues where messages were only sent the day fixes were made but then stopped working.

## Key Improvements Made

### 1. Enhanced Location Detection (`hasLocationToday` function)

**Before:**
```javascript
async function hasLocationToday(contactNumber) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const messages = await Message.find({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    'location.latitude': { $exists: true },
    timestamp: { $gte: since }
  });
  return messages.length > 0;
}
```

**After:**
```javascript
async function hasLocationToday(contactNumber) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const messages = await Message.find({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    timestamp: { $gte: since },
    $or: [
      { 'location.latitude': { $exists: true } }, // Location shared
      { body: { $regex: /location|shared|updated/i } } // Text response about location
    ]
  });
  return messages.length > 0;
}
```

**Improvements:**
- Now detects both location coordinates AND text responses about location
- Uses regex to match messages containing "location", "shared", or "updated"
- More comprehensive detection of vendor responses

### 2. Improved Reminder Detection (`hasReminderSentToday` function)

**Before:**
```javascript
async function hasReminderSentToday(contactNumber, reminderType) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const bodyRegex = new RegExp(TEMPLATE_SID, 'i');
  const messages = await Message.find({
    to: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    body: { $regex: bodyRegex },
    timestamp: { $gte: since },
    'meta.reminderType': reminderType
  });
  return messages.length > 0;
}
```

**After:**
```javascript
async function hasReminderSentToday(contactNumber, reminderType) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const messages = await Message.find({
    to: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    $or: [
      { body: TEMPLATE_SID }, // Exact template SID match
      { 'meta.reminderType': reminderType } // Meta data match
    ],
    timestamp: { $gte: since }
  });
  return messages.length > 0;
}
```

**Improvements:**
- Uses exact template SID match instead of regex
- Checks both body content AND meta data
- More reliable detection of sent reminders

### 3. New Response Tracking Function (`hasRespondedTo15MinReminder`)

**New Function:**
```javascript
async function hasRespondedTo15MinReminder(contactNumber) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  
  // Check if 15-min reminder was sent today
  const reminderSent = await Message.findOne({
    to: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    'meta.reminderType': 'vendor_location_15min',
    timestamp: { $gte: since }
  }).sort({ timestamp: -1 });
  
  if (!reminderSent) return false;
  
  // Check if vendor responded after the reminder was sent
  const response = await Message.findOne({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    timestamp: { $gte: reminderSent.timestamp },
    $or: [
      { 'location.latitude': { $exists: true } }, // Location shared
      { body: { $regex: /location|shared|updated/i } } // Text response
    ]
  });
  
  return !!response;
}
```

**Purpose:**
- Tracks if vendor responded to 15-minute reminder
- Prevents sending follow-up reminders if vendor already responded
- Improves user experience by avoiding spam

### 4. Enhanced Time Parsing

**Before:**
```javascript
const openTime = moment.tz(user.operatingHours.openTime, 'h:mm A', 'Asia/Kolkata');
```

**After:**
```javascript
try {
  const openTime = moment.tz(user.operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
  
  if (!openTime.isValid()) {
    console.log(`⚠️ Invalid open time format for ${user.contactNumber}: ${user.operatingHours.openTime}`);
    skippedCount++;
    continue;
  }
  
  // ... rest of logic
} catch (timeError) {
  console.error(`❌ Error parsing time for ${user.contactNumber}:`, timeError.message);
  errorCount++;
  continue;
}
```

**Improvements:**
- Supports multiple time formats (12-hour AM/PM, 24-hour)
- Better error handling for invalid time formats
- Graceful degradation when time parsing fails

### 5. Improved Reminder Logic

**Enhanced Opening Time Reminder Logic:**
```javascript
if (diff >= -2 && diff <= 2) {
  const hasLocation = await hasLocationToday(user.contactNumber);
  
  if (hasLocation) {
    console.log(`⏩ Skipping open-time reminder for ${user.contactNumber} - location already shared today`);
    skippedCount++;
  } else {
    // Check if vendor responded to 15-min reminder
    const respondedTo15Min = await hasRespondedTo15MinReminder(user.contactNumber);
    
    if (respondedTo15Min) {
      console.log(`⏩ Skipping open-time reminder for ${user.contactNumber} - already responded to 15-min reminder`);
      skippedCount++;
    } else if (!(await hasReminderSentToday(user.contactNumber, 'vendor_location_open'))) {
      // Send follow-up reminder
      // ... send message logic
    }
  }
}
```

**Improvements:**
- Checks if vendor responded to 15-min reminder before sending follow-up
- Prevents duplicate reminders
- Better logging and tracking

### 6. Enhanced Backup Reminder Logic

**Updated Backup Logic:**
```javascript
// Check if vendor responded to any reminder today
const respondedTo15Min = await hasRespondedTo15MinReminder(user.contactNumber);

if (respondedTo15Min) {
  console.log(`⏩ Skipping backup reminder for ${user.contactNumber} - already responded to 15-min reminder`);
  skippedCount++;
  continue;
}
```

**Improvements:**
- Backup reminders also check for vendor responses
- Prevents unnecessary backup reminders
- More intelligent reminder scheduling

## Testing

### New Test Script
Created `scripts/test-location-reminder-improvements.ts` to test all improvements:

```bash
npm run test:location-improvements
```

This script tests:
- Enhanced location detection
- Improved reminder detection
- New response tracking function
- Time parsing improvements

## Benefits

1. **Better Detection**: Now detects both location coordinates and text responses
2. **Reduced Spam**: Prevents duplicate reminders when vendors respond
3. **Improved Reliability**: Better error handling and time parsing
4. **Enhanced Logging**: More detailed tracking of reminder activities
5. **Better User Experience**: Vendors won't receive unnecessary follow-up reminders

## Files Modified

1. `server/vendorRemindersCron.js` - Main cron job logic
2. `scripts/test-location-reminder-improvements.ts` - New test script
3. `package.json` - Added test script command

## Monitoring

Use the existing monitoring tools to track the improvements:

```bash
# Monitor cron job status
npm run monitor:cron

# Test vendor reminders
npm run test:vendor-reminders

# Test location improvements
npm run test:location-improvements
```

## Expected Results

After these improvements:
- ✅ Vendors who share location won't receive follow-up reminders
- ✅ Vendors who respond with text won't receive follow-up reminders
- ✅ Better detection of vendor responses
- ✅ More reliable time parsing
- ✅ Reduced duplicate messages
- ✅ Better logging and tracking

---

**Last Updated**: December 2024
**Status**: ✅ Implemented and Tested
**Priority**: High - Critical for daily operations
