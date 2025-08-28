# Render Server Update Instructions

## 🚨 Critical: Update Render Server

The production server needs to be updated with the latest code to fix the CORS and 500 error issues.

## Method 1: GitHub Integration (Recommended)

If your Render service is connected to GitHub:

1. **Push the latest code to your repository:**
   ```bash
   git add .
   git commit -m "Fix CORS issues and inactive vendors endpoint"
   git push origin main
   ```

2. **Render will automatically deploy** the updates within a few minutes

3. **Check deployment status** in your Render dashboard

## Method 2: Manual Deployment

If you don't have GitHub integration:

1. **Go to your Render dashboard:**
   - Visit: https://dashboard.render.com
   - Find your WhatsApp Dashboard service

2. **Navigate to Manual Deploy:**
   - Click on your service
   - Go to "Manual Deploy" section
   - Click "Deploy latest commit"

3. **Wait for deployment to complete** (usually 2-5 minutes)

## Method 3: Force Redeploy

If the above methods don't work:

1. **In Render dashboard:**
   - Go to your service
   - Click "Manual Deploy"
   - Select "Clear build cache & deploy"

2. **This will force a complete rebuild** with all the latest changes

## Verification Steps

After deployment, test these endpoints:

```bash
# Test CORS headers
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type, Pragma, Cache-Control" \
     -X OPTIONS https://whatsappdashboard-1.onrender.com/api/contacts

# Test inactive vendors
curl https://whatsappdashboard-1.onrender.com/api/webhook/inactive-vendors?page=1&limit=10

# Test health endpoint
curl https://whatsappdashboard-1.onrender.com/api/health
```

## Expected Results

After successful deployment:
- ✅ CORS errors should be resolved
- ✅ Inactive vendors page should load
- ✅ Contacts API should work without errors
- ✅ Login should be faster

## Troubleshooting

If deployment fails:
1. Check Render logs for build errors
2. Verify all environment variables are set
3. Check that the build command is correct
4. Ensure the start command is properly configured

## Contact Support

If you continue to have issues:
1. Check Render's status page
2. Review the deployment logs
3. Contact Render support if needed
