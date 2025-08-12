# Weekly Vendor Message Campaign

This directory contains scripts to send the message template `HX5990e2eb62bbb374ac865ab6195fcfbe` to all vendors every 24 hours for one week.

## 📋 Files

### 1. `send-weekly-message-to-vendors.ts`
**Main script** that sends the message to all vendors in the database.

**Features:**
- ✅ Sends message to all vendors using Twilio WhatsApp API
- ✅ Logs all messages to database with metadata
- ✅ Prevents duplicate sends on the same day
- ✅ Handles errors gracefully
- ✅ Provides detailed success/failure summary
- ✅ Rate limiting (1 second delay between messages)

### 2. `weekly-vendor-message-cron.js`
**Cron job script** that runs the main script every 24 hours for 7 days.

**Features:**
- ✅ Runs every 24 hours automatically
- ✅ Stops after 7 days (configurable)
- ✅ Runs first campaign immediately
- ✅ Handles process termination gracefully
- ✅ Uses Indian timezone (Asia/Kolkata)

### 3. `test-weekly-message.ts`
**Test script** to send messages to first 3 vendors for testing.

**Features:**
- ✅ Tests with limited vendors (first 3)
- ✅ Longer delays between messages (2 seconds)
- ✅ Marks messages as test runs
- ✅ Perfect for testing before full campaign

## 🚀 Usage

### Option 1: Test First (Recommended)
```bash
# Test with 3 vendors first
npx tsx scripts/test-weekly-message.ts
```

### Option 2: Run Full Campaign Once
```bash
# Send to all vendors once
npx tsx scripts/send-weekly-message-to-vendors.ts
```

### Option 3: Run Weekly Campaign (7 days)
```bash
# Start the cron job for 7 days
node scripts/weekly-vendor-message-cron.js
```

## ⚙️ Configuration

### Template ID
- **Template SID**: `HX5990e2eb62bbb374ac865ab6195fcfbe`
- **Message Type**: `weekly_vendor_message`

### Campaign Settings
- **Duration**: 7 days
- **Interval**: Every 24 hours
- **Timezone**: Asia/Kolkata (Indian time)
- **Rate Limiting**: 1 second between messages

### Database Logging
All messages are logged to the `Message` collection with:
- Vendor name
- Template SID
- Twilio SID
- Success/failure status
- Error details (if any)
- Campaign metadata

## 📊 Monitoring

### Check Campaign Status
```bash
# Check recent campaign messages
npx tsx scripts/test-vendor-names.ts
```

### View Message Health
- Go to Message Health page in the dashboard
- Look for "Weekly Vendor Message" entries

### Database Queries
```javascript
// Check today's campaign messages
db.messages.find({
  'meta.type': 'weekly_vendor_message',
  timestamp: { $gte: new Date().setHours(0,0,0,0) }
})

// Check campaign summary
db.messages.find({
  'meta.type': 'campaign_summary'
}).sort({timestamp: -1})
```

## 🛑 Stopping the Campaign

### If running cron job:
```bash
# Press Ctrl+C to stop early
```

### If running manually:
- Just stop the script execution
- No cleanup needed - each run is independent

## 🔧 Troubleshooting

### Common Issues

1. **Twilio Authentication Error**
   - Check `.env` file has correct `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
   - Verify `TWILIO_PHONE_NUMBER` is correct

2. **Template Not Found**
   - Verify template SID `HX5990e2eb62bbb374ac865ab6195fcfbe` exists in Twilio
   - Check template is approved and active

3. **No Vendors Found**
   - Check User collection has vendors with valid phone numbers
   - Verify MongoDB connection

4. **Rate Limiting**
   - Script includes 1-second delays between messages
   - If still hitting limits, increase delay in script

### Error Logs
- All errors are logged to database in `Message` collection
- Check `meta.type: 'error'` entries
- Full error details stored in `errorMessage` field

## 📈 Success Metrics

The campaign tracks:
- ✅ Total messages sent
- ❌ Failed messages
- 📊 Success rate
- 🕐 Send timestamps
- 📱 Twilio SIDs for tracking

## 🔄 Repeating Campaigns

To run another campaign:
1. Wait for current campaign to complete (7 days)
2. Or stop current campaign with Ctrl+C
3. Run `node scripts/weekly-vendor-message-cron.js` again

Each campaign is independent and won't interfere with others.
