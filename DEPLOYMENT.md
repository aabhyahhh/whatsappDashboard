# Production Deployment Guide

## Environment Variables for Render

Set these environment variables in your Render dashboard:

### Required Variables:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://abhayacibos:laarikhojo@cluster0.dztbn64.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=123
TWILIO_ACCOUNT_SID=ACe75db7d3f9c1f92547127e5e44a9293e
TWILIO_AUTH_TOKEN=dd93990151423dae42be56bb05327c09
TWILIO_PHONE_NUMBER=+15557897194
TWILIO_MESSAGING_SERVICE_SID=MG87abfb5138585a4602bb17cb9edf41a5
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