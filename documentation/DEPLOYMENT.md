# Production Deployment Guide

## Environment Variables for Render

Set these environment variables in your Render dashboard:

### Required Variables:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.dztbn64.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your_jwt_secret_here

# Meta WhatsApp API (Required for all messaging)
META_ACCESS_TOKEN=your_meta_access_token_here
META_PHONE_NUMBER_ID=your_phone_number_id_here
META_VERIFY_TOKEN=your_webhook_verify_token_here
META_APP_SECRET=your_meta_app_secret_here
META_WEBHOOK_URL=https://whatsappdashboard-1.onrender.com/api/webhook

# Relay System
RELAY_SECRET=your_shared_secret_here

# Target URLs for forwarding
LK_URL=https://laari-khojo-backend.onrender.com/api/webhook
DASH_URL=https://whatsappdashboard-1.onrender.com/api/conversation
```

### Deployment Steps:

1. **Push code to GitHub** with the new `render.yaml` and `package.json` changes
2. **Connect repository to Render**
3. **Set environment variables** in Render dashboard using your actual credentials
4. **Deploy the service**

### Health Check:
The server will respond to: `GET /api/health`

### Database Configuration:
- **Production**: Uses `MONGODB_URI` (test database on ac-iwq0k9m cluster)
- **Development**: Uses `MONGODB_URI_DEV` (whatsapp_dev database on ac-wvrpy1t cluster)

### Troubleshooting:
- Check Render logs for connection errors
- Verify MongoDB Atlas IP whitelist includes Render's IP ranges
- Ensure all environment variables are set correctly 