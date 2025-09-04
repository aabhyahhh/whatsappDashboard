# Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Meta WhatsApp API Configuration
META_ACCESS_TOKEN=your_meta_access_token_here
META_PHONE_NUMBER_ID=your_phone_number_id_here
META_VERIFY_TOKEN=your_webhook_verify_token_here
META_WEBHOOK_URL=https://your-domain.com/api/meta-webhook

# Test Configuration
TEST_PHONE_NUMBER=+919876543210

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/whatsapp

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Server Configuration
PORT=5001
NODE_ENV=development

# Legacy Twilio Configuration (can be removed after migration)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_MESSAGING_SERVICE_SID=your_twilio_messaging_service_sid
```

## How to Get Meta WhatsApp Credentials

### 1. Meta Access Token
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use existing app
3. Add WhatsApp Business API product
4. Generate a permanent access token
5. Copy the token to `META_ACCESS_TOKEN`

### 2. Phone Number ID
1. In your Meta app, go to WhatsApp > API Setup
2. Find your phone number
3. Copy the Phone Number ID to `META_PHONE_NUMBER_ID`

### 3. Webhook Verify Token
1. Create a random string (e.g., "my_secure_verify_token_123")
2. Use this same token in both:
   - Your `.env` file as `META_VERIFY_TOKEN`
   - Meta webhook configuration

### 4. Webhook URL
1. Set your webhook URL to: `https://your-domain.com/api/meta-webhook`
2. Make sure this URL is accessible from the internet
3. The endpoint should respond to both GET (verification) and POST (webhook) requests

## Testing Your Setup

1. **Test Environment Variables**:
   ```bash
   node -e "console.log('Access Token:', !!process.env.META_ACCESS_TOKEN)"
   ```

2. **Test Meta Integration**:
   ```bash
   npm run test:meta-integration
   ```

3. **Test Webhook Verification**:
   ```bash
   curl -X GET "https://your-domain.com/api/meta-webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test"
   ```

## Message Templates Setup

Before using the system, ensure all message templates are approved in Meta Business Manager:

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to WhatsApp > Message Templates
3. Create and approve the following templates:
   - `update_location_cron`
   - `inactive_vendors_support_prompt`
   - `inactive_vendors_reply_to_yes_support_call`
   - `default_hi_and_loan_prompt`
   - `reply_to_default_hi_loan_ready_to_verify_aadhar_or_not`
   - `welcome_message_for_onboarding`

## Security Notes

- Keep your access token secure and never commit it to version control
- Use environment variables for all sensitive data
- Regularly rotate your access tokens
- Monitor API usage and rate limits

## Troubleshooting

### Common Issues

1. **"Invalid Access Token"**
   - Verify the token is correct and has proper permissions
   - Check if the token has expired

2. **"Webhook Verification Failed"**
   - Ensure `META_VERIFY_TOKEN` matches in both places
   - Check that the webhook URL is accessible

3. **"Template Not Found"**
   - Verify templates are created and approved in Meta Business Manager
   - Check template names match exactly

4. **"Rate Limit Exceeded"**
   - The system includes automatic delays, but you may need to increase them
   - Monitor Meta's rate limit documentation

### Debug Commands

```bash
# Check if server is running
curl https://your-domain.com/api/health

# Test webhook endpoint
curl -X POST https://your-domain.com/api/meta-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check logs
tail -f logs/app.log
```

