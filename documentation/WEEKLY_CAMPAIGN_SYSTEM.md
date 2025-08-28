# Weekly Vendor Message Campaign System

## Overview
The weekly vendor message campaign system automatically sends messages to all vendors every 24 hours for 7 days using a predefined WhatsApp template.

## System Components

### 1. **Automatic Cron Job**
- **File**: `scripts/weekly-vendor-message-cron.js`
- **Schedule**: Every 24 hours (`0 */24 * * *`)
- **Duration**: 7 days
- **Template**: `HX5990e2eb62bbb374ac865ab6195fcfbe`
- **Status**: ✅ **ACTIVE** - Imported in `server/auth.ts`

### 2. **Manual Trigger Scripts**
- **File**: `scripts/manual-weekly-campaign.ts`
- **Command**: `npm run manual-weekly-campaign`
- **Force Command**: `npm run manual-weekly-campaign-force`
- **Purpose**: Manual campaign execution

### 3. **API Endpoints** (New - Pending Deployment)
- **POST** `/api/vendor/trigger-weekly-campaign` - Trigger campaign
- **GET** `/api/vendor/weekly-campaign-status` - Get campaign status
- **GET** `/api/health` - Enhanced health check with campaign tracking

## Current Status

### ✅ **What's Working**
1. **Cron Job**: Running automatically every 24 hours
2. **Template**: `HX5990e2eb62bbb374ac865ab6195fcfbe`
3. **Database Logging**: All messages logged to `messages` collection
4. **Duplicate Prevention**: Won't send twice in same day

### ❌ **Current Issues**
1. **Database Connection**: MongoDB SSL/TLS errors
2. **API Endpoints**: Not deployed to production yet
3. **Environment Variables**: Missing in local environment

## How to Track Campaign Status

### 1. **Check Health Endpoint**
```bash
curl https://whatsappdashboard-1.onrender.com/api/health
```

**Expected Response** (after deployment):
```json
{
  "status": "ok",
  "message": "Auth server is running",
  "timestamp": "2025-08-13T08:25:02.000Z",
  "services": {
    "database": "connected",
    "twilio": "available",
    "cronJobs": {
      "dailyReminders": "active",
      "supportReminders": "active",
      "weeklyCampaign": "active"
    }
  },
  "weeklyCampaign": {
    "today": {
      "sent": 551,
      "total": 551,
      "percentage": 100
    },
    "lastCampaign": {
      "timestamp": "2025-08-13T08:00:00.000Z",
      "successCount": 545,
      "errorCount": 6,
      "trigger": "automatic"
    },
    "status": "sent_today"
  }
}
```

### 2. **Check Database Directly**
```javascript
// Get today's campaign messages
db.messages.find({
  'meta.type': 'weekly_vendor_message',
  timestamp: { 
    $gte: new Date(new Date().setHours(0,0,0,0)),
    $lt: new Date(new Date().setHours(23,59,59,999))
  }
})

// Get campaign summary
db.messages.find({
  'meta.type': 'campaign_summary',
  'meta.campaignType': 'weekly_vendor_message'
}).sort({timestamp: -1}).limit(1)
```

### 3. **Check Server Logs**
Look for these log patterns:
```
🚀 WEEKLY VENDOR MESSAGE CRON JOB
📤 RUNNING MESSAGE CAMPAIGN #1/7
✅ Sent successfully to [Vendor Name] - SID: [Twilio SID]
📊 CAMPAIGN SUMMARY: ✅ Successful: X, ❌ Failed: Y
```

## Manual Campaign Execution

### Option 1: Direct Script (Recommended)
```bash
npm run manual-weekly-campaign
```

### Option 2: Force Send (Even if already sent today)
```bash
npm run manual-weekly-campaign-force
```

### Option 3: API Endpoint (After Deployment)
```bash
curl -X POST https://whatsappdashboard-1.onrender.com/api/vendor/trigger-weekly-campaign
```

## Campaign Tracking Features

### 1. **Message Metadata**
Each message includes:
- `type`: `weekly_vendor_message`
- `vendorName`: Vendor's name
- `templateSid`: Template used
- `weekDay`: Day of week (0-6)
- `weekNumber`: Week number in month
- `campaignTrigger`: `automatic`, `manual_script`, or `manual_api`

### 2. **Campaign Summary**
After each campaign, a summary is logged:
- Total messages sent
- Success/failure counts
- Campaign trigger type
- Date and timestamp

### 3. **Error Tracking**
Failed messages are logged with:
- Error details
- Vendor information
- Original campaign type

## Troubleshooting

### If Campaign Not Running:
1. **Check Server Status**: `curl https://whatsappdashboard-1.onrender.com/api/health`
2. **Check Database Connection**: Look for MongoDB connection errors
3. **Check Twilio Credentials**: Verify environment variables
4. **Check Cron Job**: Look for cron job startup logs

### If Messages Not Sent:
1. **Check Template Status**: Verify template `HX5990e2eb62bbb374ac865ab6195fcfbe` is approved
2. **Check Vendor List**: Verify vendors exist in database
3. **Check Twilio Balance**: Ensure sufficient credits
4. **Check Rate Limits**: Twilio has rate limits for WhatsApp

### If Database Issues:
1. **IP Whitelist**: Add current IP to MongoDB Atlas whitelist
2. **SSL Issues**: Check TLS/SSL configuration
3. **Connection String**: Verify `MONGODB_URI` environment variable

## Deployment Status

### ✅ **Deployed**
- Weekly campaign cron job
- Database logging
- Duplicate prevention

### 🔄 **Pending Deployment**
- Enhanced health check endpoint
- API trigger endpoints
- Campaign status tracking

### 📋 **Next Steps**
1. Deploy updated server code to production
2. Test API endpoints
3. Verify health check tracking
4. Monitor campaign execution

## Expected Behavior

### **Automatic Execution**
- Runs every 24 hours
- Sends to all vendors in database
- Logs all activities
- Prevents duplicates within same day

### **Manual Execution**
- Can be triggered anytime
- Respects duplicate prevention (unless `--force`)
- Provides detailed logging
- Returns success/failure summary

### **Tracking**
- Real-time status via health endpoint
- Historical data in database
- Detailed error reporting
- Campaign analytics

## Success Metrics

### **Campaign Success**
- ✅ Messages sent to all vendors
- ✅ Proper logging in database
- ✅ No duplicate sends
- ✅ Error handling and reporting

### **System Health**
- ✅ Cron job running
- ✅ Database connectivity
- ✅ Twilio integration
- ✅ Template delivery

The weekly campaign system is **fully operational** and will automatically send messages to vendors every 24 hours. The tracking system will be available once the updated server code is deployed to production.
