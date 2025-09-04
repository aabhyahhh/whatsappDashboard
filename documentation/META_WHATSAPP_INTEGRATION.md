# Meta WhatsApp Integration Guide

This document outlines the complete migration from Twilio to Meta WhatsApp API for the Laari Khojo platform.

## Overview

The platform has been successfully migrated to use Meta's WhatsApp Business API instead of Twilio. All message templates, cron jobs, and webhook handlers have been updated to work seamlessly with Meta's API.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Meta WhatsApp API Configuration
META_ACCESS_TOKEN=your_meta_access_token_here
META_PHONE_NUMBER_ID=your_phone_number_id_here
META_VERIFY_TOKEN=your_webhook_verify_token_here
META_WEBHOOK_URL=https://your-domain.com/api/meta-webhook

# Optional: Test phone number for testing
TEST_PHONE_NUMBER=+919876543210
```

## Message Templates

The following message templates have been configured for Meta WhatsApp:

### 1. update_location_cron
- **Purpose**: Sent to vendors 15 minutes before openTime and at openTime
- **Language**: Hindi
- **Trigger**: Cron job runs every minute to check for vendors opening soon
- **Logic**: If vendor responds with location after first message, second message is not sent

### 2. inactive_vendors_support_prompt
- **Purpose**: Sent to vendors inactive for 3+ days
- **Language**: Hindi
- **Trigger**: Daily at 10:00 AM IST
- **Logic**: Sent every 24 hours until vendor replies

### 3. inactive_vendors_reply_to_yes_support_call
- **Purpose**: Confirmation message when vendor replies "yes" to support prompt
- **Language**: Hindi
- **Trigger**: When vendor responds with "yes", "हाँ", or "हां"

### 4. default_hi_and_loan_prompt
- **Purpose**: Response to greetings (hi, hello, hey, etc.)
- **Language**: Hindi
- **Trigger**: When vendor sends greeting message

### 5. reply_to_default_hi_loan_ready_to_verify_aadhar_or_not
- **Purpose**: Loan support message with Aadhaar verification button
- **Language**: Hindi
- **Trigger**: When vendor replies with "loan"
- **Features**: Interactive button for Aadhaar verification

### 6. welcome_message_for_onboarding
- **Purpose**: Welcome message for newly registered vendors
- **Language**: Hindi
- **Trigger**: When vendor is added from user management page

## API Endpoints

### Meta Webhook Endpoint
- **URL**: `/api/meta-webhook`
- **Methods**: GET (verification), POST (webhook)
- **Purpose**: Handles incoming messages and webhook verification

### Health Check
- **URL**: `/api/health`
- **Method**: GET
- **Purpose**: Check system status and Meta integration

## Cron Jobs and Schedulers

### 1. Location Update Scheduler
- **File**: `server/scheduler/metaScheduler.ts`
- **Frequency**: Every minute
- **Purpose**: Check for vendors opening soon and send location update messages

### 2. Inactive Vendor Reminder Scheduler
- **File**: `server/scheduler/metaScheduler.ts`
- **Frequency**: Daily at 10:00 AM IST
- **Purpose**: Send support reminders to inactive vendors (3+ days)

## Scripts and Utilities

### Testing Scripts
```bash
# Test Meta integration
npm run test:meta-integration

# Send location updates to all vendors
npm run send:location-update-meta

# Send inactive vendor reminders
npm run send:inactive-reminders-meta

# Send welcome messages to new vendors
npm run send:welcome-messages

# Send template to all vendors
npm run send:template-meta
```

### Manual Testing
```bash
# Test with specific phone number
TEST_PHONE_NUMBER=+919876543210 npm run test:meta-integration
```

## Message Flow Examples

### 1. Greeting Flow
1. Vendor sends: "hi"
2. System responds with: `default_hi_and_loan_prompt` template
3. Vendor replies: "loan"
4. System responds with: `reply_to_default_hi_loan_ready_to_verify_aadhar_or_not` template
5. Vendor clicks: "Yes, I'll verify Aadhar" button
6. System responds with: Aadhaar verification confirmation

### 2. Location Update Flow
1. Cron job checks every minute for vendors opening soon
2. 15 minutes before open time: Send `update_location_cron` template
3. If no location received: Send `update_location_cron` template at open time
4. If location received: Skip second message

### 3. Inactive Vendor Flow
1. Daily check for vendors inactive 3+ days
2. Send `inactive_vendors_support_prompt` template
3. If vendor replies "yes": Send `inactive_vendors_reply_to_yes_support_call` template
4. Create support call log entry

## Database Updates

The system automatically updates the following collections:
- **Messages**: All incoming/outgoing messages
- **Users**: Location updates, Aadhaar verification status
- **VendorLocation**: Location coordinates
- **SupportCallLog**: Support call requests
- **LoanReplyLog**: Loan interest tracking
- **SupportCallReminderLog**: Reminder tracking

## Error Handling

The system includes comprehensive error handling:
- Rate limiting protection
- Duplicate message prevention
- Webhook verification
- Database transaction safety
- Detailed logging

## Monitoring and Logs

All operations are logged with:
- ✅ Success indicators
- ❌ Error indicators
- 📊 Statistics and counts
- 🔄 Process status updates

## Migration Checklist

- [x] Meta WhatsApp API integration
- [x] Message template configuration
- [x] Webhook handlers
- [x] Cron job schedulers
- [x] Database models
- [x] Error handling
- [x] Testing scripts
- [x] Documentation

## Troubleshooting

### Common Issues

1. **Webhook Verification Failed**
   - Check `META_VERIFY_TOKEN` matches Meta console
   - Ensure webhook URL is accessible

2. **Template Messages Not Sending**
   - Verify templates are approved in Meta Business Manager
   - Check `META_ACCESS_TOKEN` permissions

3. **Rate Limiting**
   - System includes automatic delays between messages
   - Monitor Meta API rate limits

### Debug Commands
```bash
# Check Meta credentials
node -e "console.log('Access Token:', !!process.env.META_ACCESS_TOKEN)"

# Test webhook endpoint
curl -X GET "https://your-domain.com/api/meta-webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test"
```

## Support

For issues or questions:
1. Check logs for error messages
2. Verify environment variables
3. Test with Meta's webhook testing tools
4. Review Meta Business Manager for template status

## Future Enhancements

- [ ] Message analytics dashboard
- [ ] Template performance tracking
- [ ] Automated template approval
- [ ] Multi-language support
- [ ] Advanced interactive messages

