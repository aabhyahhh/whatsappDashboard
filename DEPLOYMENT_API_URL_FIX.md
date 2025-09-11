# API URL Fix for Production Deployment

## Problem
The frontend was trying to connect to `localhost:5001` instead of the production server `https://whatsappdashboard-1.onrender.com`, causing SSL errors and connection failures.

## Root Cause
The `VITE_API_BASE_URL` environment variable was not being passed to the frontend build process during deployment on Render.

## Solution Implemented

### 1. Updated render.yaml
Added the `VITE_API_BASE_URL` environment variable to the web service configuration:

```yaml
services:
  - type: web
    name: whatsapp-backend
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: VITE_API_BASE_URL
        value: https://whatsappdashboard-1.onrender.com
```

### 2. Created Deployment Script
Created `scripts/deploy-with-api-url-fix.sh` that ensures the environment variable is set during build:

```bash
#!/bin/bash
export VITE_API_BASE_URL=https://whatsappdashboard-1.onrender.com
npm install
npm run build
```

### 3. Verified Build Process
Tested locally that the environment variable is correctly embedded in the built files:
- ✅ Environment variable is set correctly in `.env`
- ✅ Build process picks up the variable
- ✅ Built JavaScript files contain the correct API URL
- ✅ No hardcoded localhost references in frontend code

## Files Modified

1. **render.yaml** - Added VITE_API_BASE_URL environment variable
2. **scripts/deploy-with-api-url-fix.sh** - Created deployment script
3. **DEPLOYMENT_API_URL_FIX.md** - This documentation

## How to Deploy

### Option 1: Automatic Deployment (Recommended)
Push the changes to your repository. Render will automatically:
1. Read the updated `render.yaml`
2. Set the `VITE_API_BASE_URL` environment variable
3. Build the frontend with the correct API URL
4. Deploy the application

### Option 2: Manual Deployment
If you need to deploy manually:

```bash
# Set environment variable
export VITE_API_BASE_URL=https://whatsappdashboard-1.onrender.com

# Build the project
npm run build

# Deploy to your hosting platform
```

## Verification Steps

After deployment, verify the fix by:

1. **Check Browser Console**: No more `localhost:5001` errors
2. **Test API Calls**: All API calls should go to `https://whatsappdashboard-1.onrender.com`
3. **Check Network Tab**: Verify requests are going to the correct domain
4. **Test Functionality**: Support Calls page should load without errors

## Expected Results

- ✅ No SSL errors in browser console
- ✅ API calls go to production server
- ✅ Support Calls page loads correctly
- ✅ All frontend functionality works
- ✅ No "Load failed" errors

## Environment Variables Required

Make sure these environment variables are set in Render:

### Frontend Build Variables
- `VITE_API_BASE_URL=https://whatsappdashboard-1.onrender.com`

### Backend Runtime Variables
- `MONGODB_URI`
- `JWT_SECRET`
- `META_ACCESS_TOKEN`
- `META_PHONE_NUMBER_ID`
- `META_VERIFY_TOKEN`
- `META_APP_SECRET`
- `META_WEBHOOK_URL`

## Troubleshooting

If you still see localhost errors:

1. **Clear Browser Cache**: Hard refresh (Ctrl+F5 or Cmd+Shift+R)
2. **Check Build Logs**: Verify VITE_API_BASE_URL is set during build
3. **Verify Deployment**: Ensure the latest build is deployed
4. **Check Environment Variables**: Confirm all variables are set in Render dashboard

## Related Files

- `src/contexts/ContactsContext.tsx` - Uses `import.meta.env.VITE_API_BASE_URL`
- `src/pages/SupportCalls.tsx` - Uses `import.meta.env.VITE_API_BASE_URL`
- `src/components/AdminLayout.tsx` - Uses `import.meta.env.VITE_API_BASE_URL`
- All other React components use the same pattern

## Success Criteria

The fix is successful when:
- ✅ Browser console shows no localhost errors
- ✅ Support Calls page loads successfully
- ✅ All API calls use the production URL
- ✅ No SSL certificate errors
- ✅ Frontend communicates properly with backend
# Force redeploy - Thu Sep 11 17:54:35 IST 2025
