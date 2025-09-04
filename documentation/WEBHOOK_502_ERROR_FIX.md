# Webhook 502 Error Fix Guide

## 🚨 Issue Identified

The webhook is receiving **502 Bad Gateway** errors and the `default_hi_and_loan_prompt` template is not working. This indicates:

1. **Meta WhatsApp API credentials are not set in production**
2. **The webhook is timing out or crashing**
3. **Template messages are failing**

## ✅ What Has Been Fixed

### 1. **Improved Error Handling**
- ✅ Added fallback from template messages to text messages
- ✅ Added timeout handling for webhook forwarding
- ✅ Improved error logging and debugging
- ✅ Added graceful degradation for missing templates

### 2. **Fixed Greeting Response**
- ✅ `default_hi_and_loan_prompt` now has fallback to text message
- ✅ Better error handling for template failures
- ✅ Improved logging for debugging

### 3. **Enhanced Webhook Performance**
- ✅ Added 5-second timeout for forwarding requests
- ✅ Improved error handling for network issues
- ✅ Better logging for webhook processing

## 🔧 **Root Cause: Missing Meta Credentials**

The 502 errors are happening because:

1. **Meta WhatsApp API credentials are not set in production**
2. **The conversation engine can't send responses**
3. **Webhook processing is failing**

## 🚀 **Immediate Fix Required**

### **Set Meta WhatsApp API Credentials in Production**

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

## 📱 **Create Required Templates in Meta Business Manager**

### Template 1: `default_hi_and_loan_prompt`
1. Go to [Meta Business Manager](https://business.facebook.com/)
2. WhatsApp → Message Templates → Create Template
3. **Name**: `default_hi_and_loan_prompt`
4. **Category**: `UTILITY`
5. **Language**: `Hindi` or `English`
6. **Body**: 
   ```
   👋 Namaste from Laari Khojo!
   🙏 लारी खोजो की ओर से नमस्ते!

   📩 Thanks for reaching out!
   📞 संपर्क करने के लिए धन्यवाद!

   We help you get discovered by more customers by showing your updates and services on our platform.
   🧺 हम आपके अपडेट्स और सेवाओं को अपने प्लेटफॉर्म पर दिखाकर आपको ज़्यादा ग्राहकों तक पहुँचाने में मदद करते हैं।

   💰 Interested in future loan support?
   Just reply with: *loan*
   भविष्य में लोन सहायता चाहिए?
   ➡️ जवाब में भेजें: *loan*
   ```

### Template 2: `post_support_call_message_for_vendors`
1. **Name**: `post_support_call_message_for_vendors`
2. **Category**: `UTILITY`
3. **Body**: 
   ```
   Hello,

   We hope you're doing well! Our support team is here to help you with any questions or issues you might have.

   Please reply with "yes" if you need support, or feel free to ask any questions.

   Best regards,
   Laari Khojo Support Team
   ```

## 🧪 **Testing the Fix**

### 1. **Test Webhook Verification**
```bash
curl "https://whatsappdashboard-1.onrender.com/api/webhook?hub.mode=subscribe&hub.verify_token=098765&hub.challenge=test123"
```
Should return: `test123`

### 2. **Test Greeting Response**
1. Send "hi" to your WhatsApp Business number
2. You should receive the greeting message
3. Check server logs for processing

### 3. **Test Support Call Button**
1. Use the support call button in admin interface
2. Check if message is sent successfully

## 📊 **Expected Results After Fix**

Once you set the Meta credentials, you should see:

```
🔍 Meta WhatsApp credentials check:
Access Token exists: true
Phone Number ID exists: true
Verify Token exists: true
Webhook URL exists: true

📨 Incoming Meta webhook payload
✅ Meta signature verification successful
⚡ ACK sent in 15ms
🎯 Forwarding to 1 targets: [https://whatsappdashboard-1.onrender.com/api/conversation]
✅ Successfully forwarded to https://whatsappdashboard-1.onrender.com/api/conversation

📨 Processing inbound message from +919876543210: hi
✅ Sent greeting via template message
✅ Saved inbound message: [message_id]
```

## 🚨 **No More 502 Errors**

The 502 errors will be resolved because:
- ✅ Webhook will respond immediately (200 OK)
- ✅ Meta WhatsApp API credentials will be available
- ✅ Template messages will work
- ✅ Fallback to text messages if templates fail

## 🎯 **Priority: HIGH**

**This is blocking all WhatsApp functionality!**

1. **Set Meta WhatsApp API credentials** in Render dashboard
2. **Create the required templates** in Meta Business Manager
3. **Deploy the updated code**
4. **Test the webhook functionality**

## 📚 **Additional Resources**

- **Meta setup guide**: `documentation/META_WHATSAPP_SETUP_GUIDE.md`
- **Quick setup**: `scripts/setup-meta-credentials.md`
- **Webhook troubleshooting**: `documentation/WEBHOOK_RESPONSE_TROUBLESHOOTING.md`

## 🎉 **Summary**

**✅ Webhook error handling improved**
**✅ Template fallback implemented**
**✅ Timeout handling added**
**✅ Better error logging**

**Next Step**: Set Meta WhatsApp API credentials in production environment variables.

The webhook will work perfectly once you set the Meta credentials! 🚀
