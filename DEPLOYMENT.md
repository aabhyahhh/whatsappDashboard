# Production Deployment Guide

## Environment Variables for Render

Set these environment variables in your Render dashboard:

### Required Variables:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.dztbn64.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your_jwt_secret_here
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_MESSAGING_SERVICE_SID=your_messaging_service_sid
```

### Deployment Steps:

1. **Push code to GitHub** with the new `render.yaml` and `package.json` changes
2. **Connect repository to Render**
3. **Set environment variables** in Render dashboard
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