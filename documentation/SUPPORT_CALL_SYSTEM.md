# Support Call System for Inactive Vendors

## 🎯 **System Overview**

This system automatically sends reminder messages to vendors who have been inactive for 3+ days and handles their support requests when they tap the "yes_support" button.

## 🔄 **How It Works**

### 1. **Daily Reminder System**
- **Schedule**: Runs every day at 10:00 AM
- **Target**: Vendors inactive for 3+ consecutive days
- **Frequency**: Sends reminder every 24 hours (not just once)
- **Template**: `HX4c78928e13eda15597c00ea0915f1f77`

### 2. **Support Request Handling**
- **Trigger**: Vendor taps "yes_support" button
- **Action**: Creates entry in Support Call Log
- **Response**: Sends confirmation message
- **Template**: `HXd71a47a5df1f4c784fc2f8155bb349ca`

## 📋 **System Components**

### 1. **Support Call Reminder Scheduler**
**File**: `server/scheduler/supportCallReminder.js`

**Features**:
- ✅ Runs daily at 10:00 AM
- ✅ Finds vendors inactive for 3+ days
- ✅ Sends reminder every 24 hours (not just once)
- ✅ Prevents duplicate sends within 24h
- ✅ Logs all reminder sends
- ✅ Handles Twilio client errors with retry logic

**Key Logic**:
```javascript
// Check if we should send today (based on last sent time)
const lastSent = await SupportCallReminderLog.findOne({ 
  contactNumber: contact.phone 
}).sort({ sentAt: -1 });

const shouldSendToday = !lastSent || 
  (new Date() - lastSent.sentAt) >= 24 * 60 * 60 * 1000; // 24 hours
```

### 2. **Webhook Button Handler**
**Files**: `server/routes/webhook.ts` and `server/routes/webhook.js`

**Features**:
- ✅ Detects "yes_support" button presses
- ✅ Creates SupportCallLog entry
- ✅ Sends confirmation message
- ✅ Logs all interactions

**Key Logic**:
```typescript
if (ButtonPayload === 'yes_support') {
  // Find vendor details
  const vendor = await User.findOne({ contactNumber: { $in: userNumbers } });
  
  // Create support call log entry
  await SupportCallLog.create({
    vendorName: vendorName,
    contactNumber: phone,
    timestamp: new Date(),
    completed: false
  });
  
  // Send confirmation message
  const confirmationPayload = {
    contentSid: 'HXd71a47a5df1f4c784fc2f8155bb349ca'
  };
}
```

### 3. **Database Models**

#### SupportCallLog
```javascript
{
  vendorName: String,        // Vendor's name
  contactNumber: String,     // Vendor's phone number
  timestamp: Date,           // When support was requested
  completed: Boolean,        // Whether support call was completed
  completedBy: String,       // Who marked it as completed
  completedAt: Date          // When it was completed
}
```

#### SupportCallReminderLog
```javascript
{
  contactNumber: String,     // Vendor's phone number
  sentAt: Date              // When reminder was sent
}
```

## 📊 **Current System Status**

Based on the latest test:

### ✅ **Working Components**
- **Reminder System**: ✅ Active and sending reminders
- **Support Call Logs**: ✅ 10 existing entries
- **Reminder Logs**: ✅ Tracking all sent reminders
- **24h Frequency**: ✅ Correctly calculating send intervals
- **Template IDs**: ✅ Both templates configured correctly

### 📈 **System Statistics**
- **Support Calls**: 10 total entries (mix of completed and pending)
- **Recent Reminders**: Multiple vendors receiving daily reminders
- **Test Vendor**: Ready for new support requests
- **Inactive Vendors**: 19+ days inactive vendors detected

## 🚀 **Usage Instructions**

### For Admins

1. **View Support Calls**: Go to Support Calls page in dashboard
2. **Mark as Completed**: Click "Complete" button for resolved calls
3. **Monitor Reminders**: Check reminder logs for sent messages
4. **Track Inactive Vendors**: Use Inactive Vendors page

### For Vendors

1. **Receive Reminder**: Get message after 3+ days of inactivity
2. **Request Support**: Tap "yes_support" button in reminder message
3. **Get Confirmation**: Receive confirmation that support team will contact
4. **Wait for Call**: Support team will call based on SupportCallLog entries

## 🔧 **Configuration**

### Environment Variables Required
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_whatsapp_number
TWILIO_MESSAGING_SERVICE_SID=your_messaging_service_sid
MONGODB_URI=your_mongodb_connection_string
```

### Template IDs
- **Support Call Reminder**: `HX4c78928e13eda15597c00ea0915f1f77`
- **Support Confirmation**: `HXd71a47a5df1f4c784fc2f8155bb349ca`

## 📝 **Testing**

### Manual Testing
```bash
# Test the support call system
npx tsx scripts/test-support-call-system.ts

# Test reminder sending
npx tsx scripts/test-reminder-systems.ts

# Test webhook button handling
npx tsx scripts/test-vendor-yes-response.ts
```

### Automated Testing
The system includes comprehensive logging and error handling:
- ✅ Twilio client retry logic
- ✅ Database connection error handling
- ✅ Duplicate prevention
- ✅ Rate limiting (1 second delays)

## 🎯 **Expected Workflow**

1. **Day 1-3**: Vendor is active, no reminders sent
2. **Day 4**: Vendor becomes inactive, reminder sent at 10:00 AM
3. **Day 5**: If no response, another reminder sent at 10:00 AM
4. **Day 6+**: Daily reminders continue every 24 hours
5. **Any Day**: Vendor taps "yes_support" → Support call logged → Confirmation sent
6. **Support Team**: Views Support Calls page → Calls vendor → Marks as completed

## 🔍 **Monitoring & Debugging**

### Log Locations
- **Scheduler Logs**: Console output from `supportCallReminder.js`
- **Webhook Logs**: Console output from webhook handlers
- **Database**: Direct queries to `supportcalllogs` and `supportcallreminderlogs` collections

### Common Issues & Solutions
1. **Reminders not sending**: Check Twilio credentials and MongoDB connection
2. **Button not working**: Verify webhook URL is accessible and ButtonPayload is received
3. **Duplicate entries**: System prevents duplicates within 24h automatically
4. **Template errors**: Verify template IDs are approved and active in Twilio

## 🚀 **Deployment**

The system is ready for production deployment:
- ✅ All components tested and working
- ✅ Error handling implemented
- ✅ Logging comprehensive
- ✅ Database models optimized
- ✅ Build process successful

