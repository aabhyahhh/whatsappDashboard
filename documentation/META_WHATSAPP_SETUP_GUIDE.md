# Meta WhatsApp API Setup Guide

## Overview

This guide will help you set up the Meta WhatsApp API credentials needed for the support call button and conversation management system to work in production.

## Required Environment Variables

You need to set these environment variables in your Render dashboard:

```bash
# Meta WhatsApp API credentials
META_ACCESS_TOKEN=your_meta_access_token_here
META_PHONE_NUMBER_ID=your_phone_number_id_here
META_VERIFY_TOKEN=your_webhook_verify_token_here
META_APP_SECRET=your_meta_app_secret_here
META_WEBHOOK_URL=https://whatsappdashboard-1.onrender.com/api/webhook

# Relay system
RELAY_SECRET=your_shared_secret_here

# Target URLs for forwarding
LK_URL=https://laari-khojo-backend.onrender.com/api/webhook
DASH_URL=https://whatsappdashboard-1.onrender.com/api/conversation
```

## Step-by-Step Setup

### 1. Create Meta Business App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Business" as the app type
4. Fill in app details:
   - **App Name**: WhatsApp Dashboard
   - **App Contact Email**: your-email@example.com
   - **Business Account**: Select your business account

### 2. Add WhatsApp Product

1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set up"
3. You'll see the WhatsApp configuration page

### 3. Get Phone Number ID

1. In the WhatsApp setup page, you'll see a phone number
2. Copy the **Phone Number ID** (not the actual phone number)
3. This goes in `META_PHONE_NUMBER_ID`

### 4. Generate Access Token

1. In the WhatsApp setup page, find "Temporary access token"
2. Click "Generate Token"
3. Copy the token - this goes in `META_ACCESS_TOKEN`
4. **Note**: This is a temporary token. For production, you'll need a permanent token.

### 5. Set Up Webhook

1. In the WhatsApp setup page, find "Webhook" section
2. Set **Callback URL**: `https://whatsappdashboard-1.onrender.com/api/webhook`
3. Set **Verify Token**: Choose any string (e.g., `098765`) - this goes in `META_VERIFY_TOKEN`
4. Click "Verify and Save"

### 6. Get App Secret

1. Go to App Settings → Basic
2. Find "App Secret" and click "Show"
3. Copy the secret - this goes in `META_APP_SECRET`

### 7. Create Message Templates

You need to create these templates in Meta Business Manager:

#### Template 1: `post_support_call_message_for_vendors`
1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to WhatsApp → Message Templates
3. Click "Create Template"
4. Fill in:
   - **Name**: `post_support_call_message_for_vendors`
   - **Category**: `UTILITY`
   - **Language**: `Hindi` or `English`
   - **Body**: 
     ```
     Hello {{1}},

     We hope you're doing well! Our support team is here to help you with any questions or issues you might have.

     Please reply with "yes" if you need support, or feel free to ask any questions.

     Best regards,
     Laari Khojo Support Team
     ```
5. Submit for approval

#### Template 2: Other Templates
You may also need these templates (create them as needed):
- `default_hi_and_loan_prompt`
- `reply_to_default_hi_loan_ready_to_verify_aadhar_or_not`
- `inactive_vendors_support_prompt`
- `inactive_vendors_reply_to_yes_support_call`
- `welcome_message_for_onboarding`

### 8. Set Environment Variables in Render

1. Go to your Render dashboard
2. Select your service
3. Go to "Environment" tab
4. Add each environment variable:

```
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxx
META_PHONE_NUMBER_ID=123456789012345
META_VERIFY_TOKEN=098765
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
META_WEBHOOK_URL=https://whatsappdashboard-1.onrender.com/api/webhook
RELAY_SECRET=your_shared_secret_here
LK_URL=https://laari-khojo-backend.onrender.com/api/webhook
DASH_URL=https://whatsappdashboard-1.onrender.com/api/conversation
```

### 9. Deploy and Test

1. Deploy your application
2. Test the webhook verification:
   ```bash
   curl "https://whatsappdashboard-1.onrender.com/api/webhook?hub.mode=subscribe&hub.verify_token=098765&hub.challenge=test123"
   ```
   Should return: `test123`

3. Test the support call button in the admin interface

## Troubleshooting

### Common Issues

#### 1. "Missing Meta WhatsApp credentials" Error
- **Cause**: Environment variables not set in production
- **Solution**: Add all Meta environment variables to Render dashboard

#### 2. Webhook Verification Failed
- **Cause**: Wrong verify token or webhook URL
- **Solution**: 
  - Check `META_VERIFY_TOKEN` matches what you set in Meta
  - Verify webhook URL is correct and accessible

#### 3. Template Not Found Error
- **Cause**: Template not created or not approved
- **Solution**:
  - Create the template in Meta Business Manager
  - Wait for approval (can take 24-48 hours)
  - Ensure template name matches exactly

#### 4. Authentication Errors
- **Cause**: Invalid access token or expired token
- **Solution**:
  - Generate a new access token
  - For production, use a permanent token instead of temporary

### Debug Commands

```bash
# Test webhook verification
curl "https://whatsappdashboard-1.onrender.com/api/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"

# Test support call API
curl -X POST https://whatsappdashboard-1.onrender.com/api/messages/send-support-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"to":"+919876543210","vendorName":"Test Vendor"}'

# Check environment variables (in server logs)
# Look for: "Meta WhatsApp credentials check:"
```

### Logs to Monitor

```
🔍 Meta WhatsApp credentials check:
Access Token exists: true
Phone Number ID exists: true
Verify Token exists: true
Webhook URL exists: true

📞 Sending support call message to [vendor_name] ([phone])
✅ Support call message sent successfully to [vendor_name] ([phone])
```

## Security Notes

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate tokens regularly** for security
4. **Monitor API usage** to avoid rate limits
5. **Use permanent tokens** for production

## Rate Limits

Meta WhatsApp API has rate limits:
- **Tier 1**: 1,000 messages per day
- **Tier 2**: 10,000 messages per day
- **Tier 3**: 100,000 messages per day

Monitor your usage in the Meta Business Manager dashboard.

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Meta's official documentation
3. Check server logs for detailed error messages
4. Verify all environment variables are set correctly
5. Contact the development team

## Next Steps

After setting up Meta WhatsApp API:
1. ✅ Test webhook verification
2. ✅ Test support call button functionality
3. ✅ Create and approve message templates
4. ✅ Monitor message delivery and responses
5. ✅ Set up proper error handling and logging

The Meta WhatsApp API setup is now complete! 🚀
