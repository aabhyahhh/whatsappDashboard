# Reminder Systems Implementation

## Overview
This document describes the implementation of two automated reminder systems for the WhatsApp vendor management platform.

## 1. Daily Vendor Reminders

### Purpose
Send daily reminder messages to vendors before their opening time to encourage them to share their location.

### Implementation
- **File**: `server/vendorRemindersCron.js`
- **Template**: `HXbdb716843483717790c45c951b71701e`
- **Schedule**: Runs every minute via cron job
- **Trigger Conditions**:
  - **Exactly 15 minutes before opening time** (not continuously)
  - **Exactly at opening time** (not continuously)
  - **Prevents duplicate sends** within 24 hours
- **Target**: Vendors with `whatsappConsent: true` and valid operating hours

### Features
- ✅ Prevents duplicate sends within 24 hours
- ✅ Logs all sent messages to database
- ✅ Comprehensive error handling
- ✅ Detailed logging for monitoring
- ✅ Timezone-aware (Asia/Kolkata)

### Sample Output
```
🕐 Running vendor reminders check at 2025-08-04 19:02:10
📊 Found 523 vendors with WhatsApp consent and operating hours
📱 South Queen Dosa (+91): Open at 20:00, Diff: 57 minutes
✅ Sent 15-min reminder to South Queen Dosa (+91)
📊 Vendor reminders summary: 1 sent, 0 skipped
```

## 2. Support Call Reminders

### Purpose
Send support reminder messages to vendors who have been inactive for 3+ days.

### Implementation
- **File**: `server/scheduler/supportCallReminder.js`
- **Template**: `HX4c78928e13eda15597c00ea0915f1f77`
- **Schedule**: Runs every hour at minute 5
- **Trigger Conditions**:
  - Contact hasn't been active for 3+ days
  - No reminder sent in last 24 hours

### Features
- ✅ Integrates with vendor database to show vendor names
- ✅ Prevents duplicate sends within 24 hours
- ✅ Logs all sent reminders to `SupportCallReminderLog`
- ✅ Comprehensive error handling
- ✅ Detailed logging for monitoring

### Sample Output
```
[SupportCallReminder] Running inactive vendor check...
📊 Found 113 inactive contacts
✅ Sent support reminder to New Bombay Bhel Puri Center (+919998896322)
📊 Support reminder summary: 1 sent, 0 skipped
```

## 3. System Integration

### Server Startup
Both reminder systems are automatically started when the server starts:
- **File**: `server/auth.ts`
- **Imports**: 
  - `./scheduler/supportCallReminder.js`
  - `./vendorRemindersCron.js`

### Database Models Used
- `User` - For vendor information and operating hours
- `Contact` - For tracking contact activity
- `Message` - For logging sent messages
- `SupportCallReminderLog` - For tracking support reminders

## 4. Testing Scripts

### Test Reminder Logic
```bash
npx tsx scripts/test-reminder-logic.ts
```
Tests the logic without sending actual messages.

### Test Reminder Systems
```bash
npx tsx scripts/test-reminder-systems.ts
```
Comprehensive test of both reminder systems.

### Manual Reminder Test
```bash
npx tsx scripts/manual-reminder-test.ts
```
Sends actual test messages (requires valid Twilio credentials).

## 5. Configuration Requirements

### Environment Variables
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number
MONGODB_URI=your_mongodb_uri
```

### Vendor Requirements
For daily reminders:
- `whatsappConsent: true`
- Valid `contactNumber`
- Valid `operatingHours.openTime`

For support reminders:
- Contact must be inactive for 3+ days
- No reminder sent in last 24 hours

## 6. Monitoring

### Logs to Watch
- Vendor reminders: Check for "✅ Sent" messages
- Support reminders: Check for "✅ Sent support reminder" messages
- Errors: Check for "❌ Failed to send" messages

### Database Queries
```javascript
// Check recent vendor reminders
db.messages.find({
  body: /HXbdb716843483717790c45c951b71701e/,
  timestamp: { $gte: new Date(Date.now() - 24*60*60*1000) }
})

// Check recent support reminders
db.supportcallreminderlogs.find({
  sentAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
})
```

## 7. Troubleshooting

### Common Issues
1. **No reminders being sent**: Check Twilio credentials
2. **Duplicate sends**: Check message logging logic
3. **Wrong timing**: Verify timezone settings (Asia/Kolkata)
4. **Missing vendors**: Check `whatsappConsent` and operating hours

### Debug Commands
```bash
# Test reminder logic
npx tsx scripts/test-reminder-logic.ts

# Check server logs
tail -f server.log | grep -E "(reminder|Reminder)"

# Check database
npx tsx scripts/test-reminder-systems.ts
```

## 8. Recent Fixes

### Fixed: Continuous Message Issue (August 2025)
**Problem**: Daily reminder messages were being sent continuously every 2-3 minutes instead of only at the specified times.

**Solution**: 
- Changed timing logic from `diff <= 15 && diff > 0` to `diff === 15`
- Now sends reminders ONLY at exactly 15 minutes before opening time
- Sends reminders ONLY at exactly opening time (diff === 0)
- Added better logging to show only relevant vendors (within 20 minutes of opening)

**Result**: Messages are now sent only twice per vendor per day:
1. Exactly 15 minutes before opening time
2. Exactly at opening time

## 9. Status

✅ **Daily Vendor Reminders**: Fully implemented and active (FIXED)
✅ **Support Call Reminders**: Fully implemented and active
✅ **System Integration**: Both systems properly integrated
✅ **Error Handling**: Comprehensive error handling implemented
✅ **Logging**: Detailed logging for monitoring
✅ **Testing**: Multiple test scripts available

Both reminder systems are now operational and will automatically send messages to vendors based on their operating hours and activity status. 