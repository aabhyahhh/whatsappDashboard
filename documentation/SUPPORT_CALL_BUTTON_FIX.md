# Support Call Button Fix - Meta WhatsApp API Configuration

## 🚨 Problem Identified

The support call button is failing with a **500 error** when trying to send messages to vendors. The error message is:

```
Failed to send support call message: Failed to send template message
```

## 🔍 Root Cause Analysis

The issue is that the **Meta WhatsApp API credentials are not properly configured in production**. The system has been migrated from Twilio to Meta WhatsApp API, but the production environment is missing the required environment variables.

### What's Happening:
1. User clicks "Support Call" button in the admin dashboard
2. Frontend sends request to `/api/messages/send-support-call`
3. Backend tries to send message using Meta WhatsApp API
4. Meta API returns error because credentials are missing/invalid
5. Backend returns 500 error to frontend
6. User sees "Failed to send support call message" error

## ✅ Solution

### Step 1: Set Meta WhatsApp API Credentials in Production

Go to your **Render dashboard** and add these environment variables:

```bash
# Meta WhatsApp API (REQUIRED)
META_ACCESS_TOKEN=your_meta_access_token_here
META_PHONE_NUMBER_ID=your_phone_number_id_here
META_VERIFY_TOKEN=098765
META_APP_SECRET=your_meta_app_secret_here
META_WEBHOOK_URL=https://whatsappdashboard-1.onrender.com/api/webhook

# Relay system
RELAY_SECRET=your_shared_secret_here

# Target URLs
LK_URL=https://laari-khojo-backend.onrender.com/api/webhook
DASH_URL=https://whatsappdashboard-1.onrender.com/api/conversation
```

### Step 2: Create Message Template in Meta Business Manager

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to **WhatsApp** → **Message Templates**
3. Click **"Create Template"**
4. Fill in the template details:

   **Template Name**: `post_support_call_message_for_vendors`
   
   **Category**: `UTILITY`
   
   **Language**: `Hindi` or `English`
   
   **Body**:
   ```
   Hello {{1}},

   We hope you're doing well! Our support team is here to help you with any questions or issues you might have.

   Please reply with "yes" if you need support, or feel free to ask any questions.

   Best regards,
   Laari Khojo Support Team
   ```

5. **Submit for approval** (can take 24-48 hours)

### Step 3: Configure Webhook in Meta

1. In Meta Business Manager, go to **WhatsApp** → **Configuration**
2. Set **Webhook URL**: `https://whatsappdashboard-1.onrender.com/api/webhook`
3. Set **Verify Token**: `098765`
4. Click **"Verify and Save"**

### Step 4: Test the Fix

After setting up the credentials, test the support call button:

```bash
# Test the API endpoint directly
curl -X POST https://whatsappdashboard-1.onrender.com/api/messages/send-support-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "+919876543210",
    "vendorName": "Test Vendor",
    "template": "post_support_call_message_for_vendors_util"
  }'
```

## 🔧 Code Changes Made

### 1. Enhanced Error Logging in `server/routes/messages.ts`

Added detailed error messages to help diagnose the issue:

```typescript
if (!result) {
    console.log('❌ Failed to send template message - result is null');
    console.log('🔍 This usually means Meta WhatsApp API credentials are missing or invalid');
    console.log('🔍 Required environment variables: META_ACCESS_TOKEN, META_PHONE_NUMBER_ID');
    console.log('🔍 Check if template is approved in Meta Business Manager');
    throw new Error('Failed to send template message - check Meta API credentials and template approval');
}
```

### 2. Improved Debugging in `server/meta.ts`

Added helpful error messages for missing credentials:

```typescript
console.error('🔍 To fix this issue:');
console.error('1. Set META_ACCESS_TOKEN in your environment variables');
console.error('2. Set META_PHONE_NUMBER_ID in your environment variables');
console.error('3. Ensure the template is approved in Meta Business Manager');
```

## 📊 Expected Results After Fix

Once you set the Meta credentials, you'll see:

```
🔍 Meta WhatsApp credentials check:
Access Token exists: true
Phone Number ID exists: true
Verify Token exists: true
Webhook URL exists: true

📞 Sending support call message to [vendor_name] ([phone])
✅ Template message sent successfully: [Meta API response]
✅ Support call message sent successfully to [vendor_name] ([phone])
```

## 🧪 Testing Commands

```bash
# Test support call button functionality
npx tsx scripts/test-support-call-button.ts

# Test Meta API integration
npx tsx scripts/test-meta-api.ts

# Test complete Meta flow
npx tsx scripts/test-complete-meta-flow.ts
```

## 🚨 Important Notes

1. **Template Approval**: The message template must be approved by Meta before it can be used. This can take 24-48 hours.

2. **Access Token**: Make sure you're using a permanent access token, not a temporary one.

3. **Phone Number ID**: This is different from the actual phone number - it's the ID assigned by Meta.

4. **Rate Limits**: Meta WhatsApp API has rate limits. Monitor your usage in the Meta Business Manager dashboard.

## 🔍 Troubleshooting

### If you still get errors after setting credentials:

1. **Check Template Status**: Ensure the template is approved in Meta Business Manager
2. **Verify Credentials**: Double-check that all environment variables are set correctly
3. **Check Logs**: Look at the server logs for detailed error messages
4. **Test API**: Use the test commands above to verify the integration

### Common Error Messages:

- `"Missing Meta WhatsApp credentials"` → Set META_ACCESS_TOKEN and META_PHONE_NUMBER_ID
- `"Template not found"` → Create and approve the template in Meta Business Manager
- `"Authentication failed"` → Check if the access token is valid and not expired
- `"Rate limit exceeded"` → Wait and try again, or upgrade your Meta API tier

## 📚 Related Documentation

- [Meta WhatsApp Setup Guide](META_WHATSAPP_SETUP_GUIDE.md)
- [Meta Integration Summary](META_INTEGRATION_SUMMARY.md)
- [Twilio to Meta Migration](TWILIO_TO_META_MIGRATION_COMPLETE.md)

## 🎯 Priority: HIGH

**This fix is critical for the support call button functionality.** Once the Meta credentials are set up, the support call button will work immediately and vendors will receive WhatsApp messages when admins click the support call button.

---

**Status**: ✅ **Code fixes implemented**  
**Next Step**: ⚠️ **Set Meta WhatsApp API credentials in production environment**
