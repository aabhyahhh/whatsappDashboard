# WhatsApp Scheduler Deployment Guide

## Overview

This guide explains how to deploy the fixed WhatsApp scheduler as a separate worker process to ensure reliable message delivery.

## What Was Fixed

### 1. Timezone Handling
- ✅ Set `TZ=Asia/Kolkata` before any imports
- ✅ Use explicit timezone in moment.js calls
- ✅ Ensure cron jobs run in IST

### 2. Meta API Credentials
- ✅ Improved validation with better error messages
- ✅ Support for alternative environment variable names
- ✅ Fail-fast with clear error reporting

### 3. MongoDB Connection
- ✅ Ensure connection before scheduling
- ✅ Proper error handling for connection issues

### 4. Heartbeat Monitoring
- ✅ 5-minute heartbeat logs
- ✅ Next invocation times displayed
- ✅ Easy monitoring of scheduler health

### 5. Error Logging
- ✅ Better error messages for invalid openTime
- ✅ Detailed logging for debugging
- ✅ Vendor-specific error tracking

## Deployment Options

### Option 1: Render Worker (Recommended)

1. **Create a new Worker service on Render**
   - Service Type: Worker
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/scripts/start-scheduler-worker.js`

2. **Set Environment Variables**
   ```
   TZ=Asia/Kolkata
   NODE_ENV=production
   MONGODB_URI=your_mongodb_connection_string
   META_ACCESS_TOKEN=your_meta_access_token
   META_PHONE_NUMBER_ID=your_meta_phone_number_id
   META_VERIFY_TOKEN=your_meta_verify_token
   META_APP_SECRET=your_meta_app_secret
   ```

3. **Deploy and Monitor**
   - Deploy the worker
   - Check logs for startup messages
   - Monitor heartbeat logs

### Option 2: PM2 (VM/Server)

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 status
   ```

3. **Monitor**
   ```bash
   pm2 logs whatsapp-scheduler
   ```

### Option 3: Local Development

1. **Test the scheduler**
   ```bash
   npm run test:scheduler
   ```

2. **Start the worker**
   ```bash
   npm run start:scheduler
   ```

## Verification Steps

### 1. Check Startup Logs
Look for these messages in the logs:
```
✅ Mongo connected for scheduler
✅ FIXED Open-time location update scheduler started
✅ FIXED Inactive vendor support scheduler started
🔐 Meta creds present. Scheduler will attempt sends when due.
```

### 2. Monitor Heartbeat
Every 5 minutes, you should see:
```
[SchedulerHeartbeat] 2025-09-10 12:30:00 IST | Next inactive: Wed Sep 11 2025 10:00:00 GMT+0530 | Next location: Wed Sep 10 2025 12:31:00 GMT+0530
```

### 3. Check Database Activity
Run these MongoDB queries to verify activity:

```javascript
// Check recent outbound messages
db.messages.find({
  direction: 'outbound',
  timestamp: { $gte: new Date(Date.now()-24*3600*1000) }
}).count()

// Check dispatch logs for today
db.dispatchlogs.find({
  date: moment().tz('Asia/Kolkata').format('YYYY-MM-DD')
}).count()

// Check support prompts in last 24h
db.messages.find({
  'meta.reminderType': 'support_prompt',
  timestamp: { $gte: new Date(Date.now()-24*3600*1000) }
}).count()
```

## Troubleshooting

### Issue: No heartbeat logs
**Solution**: Check if the worker is running and environment variables are set

### Issue: "META creds missing" error
**Solution**: Verify all Meta API credentials are properly set

### Issue: MongoDB connection errors
**Solution**: Check MONGODB_URI and network connectivity

### Issue: No messages being sent
**Solution**: 
1. Check if vendors have valid operating hours
2. Verify Meta API credentials are correct
3. Check for any error logs in the scheduler

## Testing

### Quick Test
```bash
npm run test:scheduler
```

### Manual Trigger
```bash
curl -X POST https://your-domain.com/api/vendor/check-vendor-reminders
```

### Check Inactive Vendors
```bash
curl https://your-domain.com/api/webhook/inactive-vendors?limit=5
```

## Production Checklist

- [ ] Worker service deployed and running
- [ ] Environment variables set correctly
- [ ] Heartbeat logs appearing every 5 minutes
- [ ] Next invocation times showing correctly
- [ ] No error messages in logs
- [ ] Database connectivity confirmed
- [ ] Meta API credentials validated

## Monitoring

### Key Metrics to Watch
1. **Heartbeat frequency**: Should appear every 5 minutes
2. **Next invocation times**: Should show future scheduled times
3. **Error logs**: Should be minimal or none
4. **Message counts**: Should increase during scheduled times

### Alert Conditions
- No heartbeat for 10+ minutes
- Repeated Meta API errors
- MongoDB connection failures
- High error rates in logs

## Support

If you encounter issues:
1. Check the logs for error messages
2. Verify environment variables
3. Test Meta API credentials manually
4. Check database connectivity
5. Review the troubleshooting section above

The scheduler is now production-ready with proper error handling, monitoring, and timezone support.
