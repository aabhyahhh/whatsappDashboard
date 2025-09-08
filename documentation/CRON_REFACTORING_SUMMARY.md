# Cron Refactoring Summary

## 🎯 **Objective**
Refactor the codebase to keep only two cron jobs as specified:
1. **Open-time pings**: Send `update_location_cron_util` exactly twice (T-15min and T) using dispatch log
2. **Support reminders**: Send `inactive_vendors_support_prompt_util` daily to vendors inactive ≥5 days

## ✅ **Changes Implemented**

### **1. Created DispatchLog Model**
**File**: `server/models/DispatchLog.js` & `server/models/DispatchLog.d.ts`

**Purpose**: Track open-time ping dispatches with unique index to prevent duplicates

**Schema**:
```javascript
{
  vendorId: ObjectId (ref: 'User'),
  date: String (YYYY-MM-DD),
  type: 'preOpen' | 'open',
  sentAt: Date,
  messageId: String,
  success: Boolean,
  error: String
}
```

**Indexes**:
- Unique compound: `{ vendorId: 1, date: 1, type: 1 }`
- Query optimization: `{ date: 1, type: 1 }`, `{ vendorId: 1, sentAt: -1 }`

### **2. Refactored metaScheduler.ts**
**File**: `server/scheduler/metaScheduler.ts`

**Changes**:
- ✅ **Single minute-by-minute scheduler** in Asia/Kolkata timezone
- ✅ **Exact timing**: Sends at T-15min and T (not time windows)
- ✅ **Dispatch log integration**: Uses unique index to prevent duplicates
- ✅ **Timezone correctness**: Uses `moment-timezone` with 'Asia/Kolkata'
- ✅ **Idempotency**: Checks dispatch log before sending
- ✅ **WhatsApp consent**: Only sends to vendors with `whatsappConsent: true`

**Logic**:
```typescript
// Send exactly 15 minutes before opening
if (diff === 15) {
  const dispatchType = 'preOpen';
  // Check dispatch log for duplicates
  // Send template message
  // Log to dispatch log
}

// Send exactly at opening time
if (diff === 0) {
  const dispatchType = 'open';
  // Check dispatch log for duplicates
  // Send template message
  // Log to dispatch log
}
```

### **3. Refactored supportCallReminder.js**
**File**: `server/scheduler/supportCallReminder.js`

**Changes**:
- ✅ **Daily schedule**: Runs at 10:00 AM IST
- ✅ **5-day threshold**: Sends to vendors inactive ≥5 days
- ✅ **Repeat until reply**: Continues daily until vendor responds
- ✅ **Reply detection**: Checks if vendor replied to support prompt
- ✅ **Meta API only**: Removed Twilio credential checks
- ✅ **Timezone correctness**: Uses `moment-timezone` with 'Asia/Kolkata'

**Logic**:
```javascript
// Find vendors inactive for 5+ days
const fiveDaysAgo = moment().tz('Asia/Kolkata').subtract(5, 'days').startOf('day').toDate();
const inactiveContacts = await Contact.find({ lastSeen: { $lte: fiveDaysAgo } });

// Check if vendor replied to support prompt
const hasReplied = await hasRepliedToSupportPrompt(contact.phone);
if (hasReplied) {
  // Skip - vendor already responded
}

// Send daily until reply
const shouldSendToday = !lastSent || (now - lastSent.sentAt) >= 24 * 60 * 60 * 1000;
```

### **4. Removed Duplicate Code**
**Deleted Files**:
- ❌ `server/vendorRemindersCron.js` (replaced by metaScheduler.ts)

**Updated Files**:
- ✅ `server/auth.ts` - Removed vendorRemindersCron import
- ✅ `server/routes/vendor.ts` - Updated check-vendor-reminders endpoint
- ✅ `server/routes/vendor.js` - Updated check-vendor-reminders endpoint

### **5. Created Test Script**
**File**: `scripts/test-refactored-crons.ts`

**Purpose**: Comprehensive testing of refactored cron implementation

**Tests**:
- ✅ DispatchLog model accessibility
- ✅ Vendors with operating hours
- ✅ Inactive vendors (5+ days)
- ✅ Recent dispatch logs
- ✅ Recent support reminder logs
- ✅ Recent template messages
- ✅ Timezone and timing validation

## 🔧 **Technical Details**

### **Template Usage**
- **Location updates**: `update_location_cron_util`
- **Support prompts**: `inactive_vendors_support_prompt_util`
- **Support replies**: `inactive_vendors_reply_to_yes_support_call_util` (existing pipeline)

### **Database Models Used**
- `User` - Vendor information and operating hours
- `Contact` - Last seen timestamps for inactivity detection
- `Message` - Message tracking and history
- `DispatchLog` - Open-time ping tracking (NEW)
- `SupportCallReminderLog` - Support reminder tracking
- `SupportCallLog` - Support call entries (existing pipeline)

### **Timezone Handling**
- All time calculations use `moment-timezone` with 'Asia/Kolkata'
- Date comparisons use IST timezone consistently
- Cron schedules run in server timezone but calculations in IST

### **Error Handling**
- Comprehensive try-catch blocks
- Graceful error logging
- Database connection validation
- Meta API credential validation

## 🚀 **Deployment Instructions**

### **1. Database Migration**
The new `DispatchLog` model will be created automatically when the application starts.

### **2. Environment Variables Required**
```bash
META_ACCESS_TOKEN=your_meta_access_token
META_PHONE_NUMBER_ID=your_phone_number_id
MONGODB_URI=your_mongodb_connection_string
```

### **3. Testing**
```bash
# Test the refactored implementation
npm run test:refactored-crons

# Monitor cron status (if available)
npm run monitor:cron
```

### **4. Verification**
- Check server logs for scheduler initialization messages
- Monitor dispatch logs in database
- Verify template messages are being sent
- Check support reminder logs

## 📊 **Expected Behavior**

### **Open-time Location Updates**
- **Frequency**: Every minute
- **Timing**: Exactly 15 minutes before and exactly at opening time
- **Recipients**: Vendors with `whatsappConsent: true` and operating hours
- **Template**: `update_location_cron_util`
- **Idempotency**: Dispatch log prevents duplicates
- **Timezone**: Asia/Kolkata

### **Support Reminders**
- **Frequency**: Daily at 10:00 AM IST
- **Recipients**: Vendors inactive for 5+ days
- **Template**: `inactive_vendors_support_prompt_util`
- **Repeat**: Daily until vendor replies
- **Pipeline**: Existing support call system remains intact

## 🔍 **Monitoring**

### **Key Metrics to Monitor**
1. **Dispatch Log Entries**: Track successful/failed dispatches
2. **Support Reminder Logs**: Track reminder frequency
3. **Template Message Counts**: Verify message delivery
4. **Error Rates**: Monitor failed dispatches
5. **Vendor Response Rates**: Track engagement

### **Log Messages to Watch**
```
✅ Open-time location update scheduler started
✅ Inactive vendor support reminder scheduler initialized
📍 Sending preOpen reminder to [vendor] - 15 mins before open time
📍 Sending open reminder to [vendor] - at open time
📱 Sending inactive vendor support prompt to [vendor]
```

## 🎉 **Benefits of Refactoring**

1. **Eliminated Duplicates**: No more conflicting schedulers
2. **Improved Reliability**: Unique dispatch log prevents duplicate messages
3. **Better Performance**: Single scheduler per function
4. **Timezone Accuracy**: Consistent IST timezone handling
5. **Idempotency**: Guaranteed no duplicate dispatches
6. **Maintainability**: Cleaner, more focused code
7. **Monitoring**: Better tracking and logging

## ⚠️ **Important Notes**

1. **Backup**: The old `vendorRemindersCron.js` has been deleted
2. **API Changes**: `/api/vendor/check-vendor-reminders` now returns 410 (Gone)
3. **Database**: New `DispatchLog` collection will be created
4. **Templates**: Ensure `update_location_cron_util` and `inactive_vendors_support_prompt_util` are approved
5. **Timezone**: All calculations now use Asia/Kolkata timezone consistently

The refactoring is complete and ready for deployment! 🚀
