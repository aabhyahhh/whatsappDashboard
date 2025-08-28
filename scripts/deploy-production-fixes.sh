#!/bin/bash

echo "🚀 Deploying Production Fixes for WhatsApp Dashboard..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Build the project
print_status "Building project with all fixes..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Step 2: Create deployment folder
print_status "Creating deployment package..."
mkdir -p deployment-production
cp -r dist/* deployment-production/

# Step 3: Create visible htaccess file
if [ -f "public/.htaccess" ]; then
    cp public/.htaccess deployment-production/htaccess.txt
    print_success "Created htaccess.txt for easy renaming on Hostinger"
fi

# Step 4: Create deployment instructions
cat > deployment-production/DEPLOYMENT_INSTRUCTIONS.md << 'EOF'
# Production Deployment Instructions - Critical Fixes

## 🚨 Critical Issues Fixed

### 1. CORS Configuration
- ✅ Added missing headers to CORS configuration
- ✅ Fixed 'Pragma' and 'Cache-Control' header issues
- ✅ Updated both Express CORS and manual CORS headers

### 2. Performance Optimizations
- ✅ Database indexes for faster queries
- ✅ N+1 query problem fixed in contacts API
- ✅ Optimized connection settings for Render
- ✅ Improved error handling and timeouts

### 3. Vendor Reminders System
- ✅ Simplified cron job running every minute
- ✅ All vendors have WhatsApp consent enabled
- ✅ Fixed template ID and reminder logic

### 4. Inactive Vendors Endpoint
- ✅ Optimized aggregation pipeline
- ✅ Fixed 500 error issues
- ✅ Improved performance and error handling

## 📋 Deployment Steps

### 1. Upload to Hostinger
1. Upload all files from this folder to your `public_html` directory
2. Rename `htaccess.txt` to `.htaccess` in your Hostinger file manager
3. Ensure `.htaccess` is in the root of public_html

### 2. Update Render Server (CRITICAL)
The production server needs to be updated with the latest code.

**Option A: Automatic Deployment (Recommended)**
- If you have GitHub integration with Render, push these changes to your repository
- Render will automatically deploy the updates

**Option B: Manual Deployment**
1. Go to your Render dashboard
2. Navigate to your WhatsApp Dashboard service
3. Go to "Manual Deploy" section
4. Deploy the latest code from your repository

### 3. Verify Deployment
After deployment, test these endpoints:
- ✅ `/api/contacts` - Should load without CORS errors
- ✅ `/api/webhook/inactive-vendors` - Should return data without 500 errors
- ✅ Login should work in under 3 seconds
- ✅ Vendor reminders should be working

## 🔧 Testing Commands

Run these commands to verify the fixes:

```bash
# Test CORS and contacts API
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type, Pragma, Cache-Control" \
     -X OPTIONS https://whatsappdashboard-1.onrender.com/api/contacts

# Test inactive vendors endpoint
curl https://whatsappdashboard-1.onrender.com/api/webhook/inactive-vendors?page=1&limit=10

# Test health endpoint
curl https://whatsappdashboard-1.onrender.com/api/health
```

## 🚨 Important Notes

1. **CORS Headers**: The server now allows 'Pragma' and 'Cache-Control' headers
2. **Database Indexes**: Performance indexes are already created
3. **WhatsApp Consent**: All 552 vendors have consent enabled
4. **Vendor Reminders**: System is simplified and running every minute

## 📞 Support

If issues persist after deployment:
1. Check Render logs for any deployment errors
2. Verify the server is running the latest code
3. Test the endpoints using the curl commands above
4. Check browser console for any remaining CORS errors

## 🎯 Expected Results

After deployment:
- ✅ No more CORS errors in browser console
- ✅ Inactive vendors page loads in under 2 seconds
- ✅ Contact sidebar loads quickly
- ✅ Login completes in under 3 seconds
- ✅ Vendor reminders work correctly
EOF

print_success "Deployment package ready in 'deployment-production' folder"
print_status "📁 Upload contents of 'deployment-production' folder to Hostinger public_html"
print_warning "⚠️  CRITICAL: Update Render server with latest code for CORS fixes"
print_status "📝 See DEPLOYMENT_INSTRUCTIONS.md for detailed steps"

# Step 5: Create a quick verification script
cat > deployment-production/verify-fixes.js << 'EOF'
// Quick verification script for production fixes
const API_BASE_URL = 'https://whatsappdashboard-1.onrender.com';

async function verifyFixes() {
    console.log('🧪 Verifying production fixes...');
    
    // Test 1: CORS headers
    console.log('\n1️⃣ Testing CORS configuration...');
    try {
        const corsResponse = await fetch(`${API_BASE_URL}/api/contacts`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:5173',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type, Pragma, Cache-Control'
            }
        });
        console.log(`   CORS Status: ${corsResponse.status}`);
        if (corsResponse.status === 200) {
            console.log('   ✅ CORS configuration is working');
        } else {
            console.log('   ❌ CORS configuration needs update');
        }
    } catch (error) {
        console.log('   ❌ CORS test failed:', error.message);
    }
    
    // Test 2: Contacts API
    console.log('\n2️⃣ Testing contacts API...');
    try {
        const contactsResponse = await fetch(`${API_BASE_URL}/api/contacts`);
        console.log(`   Contacts Status: ${contactsResponse.status}`);
        if (contactsResponse.ok) {
            const data = await contactsResponse.json();
            console.log(`   ✅ Contacts API working - ${data.length} contacts`);
        } else {
            console.log('   ❌ Contacts API failed');
        }
    } catch (error) {
        console.log('   ❌ Contacts test failed:', error.message);
    }
    
    // Test 3: Inactive vendors
    console.log('\n3️⃣ Testing inactive vendors...');
    try {
        const inactiveResponse = await fetch(`${API_BASE_URL}/api/webhook/inactive-vendors?page=1&limit=5`);
        console.log(`   Inactive Status: ${inactiveResponse.status}`);
        if (inactiveResponse.ok) {
            const data = await inactiveResponse.json();
            console.log(`   ✅ Inactive vendors working - ${data.vendors?.length || 0} vendors`);
        } else {
            console.log('   ❌ Inactive vendors failed');
        }
    } catch (error) {
        console.log('   ❌ Inactive vendors test failed:', error.message);
    }
    
    // Test 4: Health endpoint
    console.log('\n4️⃣ Testing health endpoint...');
    try {
        const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
        console.log(`   Health Status: ${healthResponse.status}`);
        if (healthResponse.ok) {
            const data = await healthResponse.json();
            console.log(`   ✅ Health endpoint working - ${data.status}`);
        } else {
            console.log('   ❌ Health endpoint failed');
        }
    } catch (error) {
        console.log('   ❌ Health test failed:', error.message);
    }
    
    console.log('\n🎯 Verification complete!');
}

verifyFixes();
EOF

print_success "Created verification script: deployment-production/verify-fixes.js"
print_status "Run this script in browser console after deployment to verify fixes"
