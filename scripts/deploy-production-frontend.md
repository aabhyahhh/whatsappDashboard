# Production Frontend Deployment Guide

## Issue
Support calls are visible in the production database but not showing on the live site because the frontend is not connecting to the production backend.

## Solution

### 1. Environment Variable Configuration
The frontend needs to use the production backend URL. Set this environment variable:

```bash
VITE_API_BASE_URL=https://whatsappdashboard.onrender.com
```

### 2. Build for Production
```bash
npm run build
```

### 3. Deploy to Hostinger
Upload the `dist/` folder contents to your Hostinger hosting.

### 4. Alternative: Environment File
Create a `.env.production` file in your project root:

```env
VITE_API_BASE_URL=https://whatsappdashboard.onrender.com
```

Then build:
```bash
npm run build
```

### 5. Verify Configuration
After deployment, the frontend should:
- Connect to `https://whatsappdashboard.onrender.com/api/webhook/support-calls`
- Display support calls from the production database
- Show all 6 support calls currently in the database

### 6. Test the Connection
You can test if the frontend is correctly configured by:
1. Opening browser developer tools
2. Going to the Support Calls page
3. Checking the Network tab to see if API calls are going to the correct URL

### Current Production Data
The production backend has these support calls:
- Rajasthani Dalbaati (+918949771621)
- The Daily Grind (+919924305958) 
- Vadodarani Prakhyat Sev Usad (+917600686419)
- MS Chhole Kulche (+919522012061)
- Dk Egg Point (+916353993692)
- Jay Dwarkadhish Maggie Pasta (+918160465778)

All should be visible on the live site after correct deployment. 