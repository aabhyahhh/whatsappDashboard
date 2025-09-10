# Quick Setup Guide for Meta WhatsApp API Credentials

## 🚨 URGENT: Fix the "Missing Meta WhatsApp credentials" Error

The support call button is failing because the Meta WhatsApp API credentials are not set in production. Here's how to fix it:

## Step 1: Get Meta WhatsApp API Credentials

### Option A: If you already have a Meta Business App
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Select your existing app
3. Go to WhatsApp → API Setup
4. Copy these values:
   - **Phone Number ID** → `META_PHONE_NUMBER_ID`
   - **Temporary Access Token** → `META_ACCESS_TOKEN`
   - **App Secret** (from App Settings → Basic) → `META_APP_SECRET`

### Option B: If you need to create a new Meta Business App
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "Create App" → "Business"
3. Add WhatsApp product
4. Follow the setup wizard to get credentials

## Step 2: Set Environment Variables in Render

Go to your Render dashboard and add these environment variables:

```bash
# Meta WhatsApp API (REQUIRED for support call button)
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxx
META_PHONE_NUMBER_ID=123456789012345
META_VERIFY_TOKEN=098765
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
META_WEBHOOK_URL=https://whatsappdashboard-1.onrender.com/api/webhook

# Relay system
RELAY_SECRET=your_shared_secret_here

# Target URLs
LK_URL=https://laari-khojo-backend.onrender.com/api/webhook
DASH_URL=https://whatsappdashboard-1.onrender.com/api/conversation
```

## Step 3: Create Message Template

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. WhatsApp → Message Templates → Create Template
3. **Name**: `post_support_call_message_for_vendors`
4. **Category**: `UTILITY`
5. **Body**:
   ```
   Hello,

   We hope you're doing well! Our support team is here to help you with any questions or issues you might have.

   Please reply with "yes" if you need support, or feel free to ask any questions.

   Best regards,
   Laari Khojo Support Team
   ```
6. Submit for approval (takes 24-48 hours)

## Step 4: Test the Fix

After setting the environment variables:

1. **Redeploy** your application on Render
2. **Test webhook verification**:
   ```bash
   curl "https://whatsappdashboard-1.onrender.com/api/webhook?hub.mode=subscribe&hub.verify_token=098765&hub.challenge=test123"
   ```
   Should return: `test123`

3. **Test support call button** in the admin interface

## Expected Results

After fixing, you should see these logs:
```
🔍 Meta WhatsApp credentials check:
Access Token exists: true
Phone Number ID exists: true
Verify Token exists: true
Webhook URL exists: true

📞 Sending support call message to [vendor_name] ([phone])
✅ Support call message sent successfully to [vendor_name] ([phone])
```

## Quick Test Commands

```bash
# Test if credentials are working
curl -X POST https://whatsappdashboard-1.onrender.com/api/messages/send-support-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"to":"+919876543210","vendorName":"Test Vendor"}'
```

## If You Still Get Errors

1. **Check Render logs** for detailed error messages
2. **Verify all environment variables** are set correctly
3. **Ensure template is approved** in Meta Business Manager
4. **Check Meta API permissions** and rate limits

## Need Help?

- Check the full setup guide: `documentation/META_WHATSAPP_SETUP_GUIDE.md`
- Review troubleshooting section in the guide
- Contact the development team

---

**Priority**: HIGH - This is blocking the support call button functionality
**Estimated fix time**: 30 minutes (once you have Meta credentials)
**Impact**: Support call button will work immediately after fixing
