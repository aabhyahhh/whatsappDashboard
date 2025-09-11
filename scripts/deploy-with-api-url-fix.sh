#!/bin/bash

# Deployment Script with API URL Fix
echo "🚀 Deployment Script with API URL Fix"
echo "===================================="

# Set the correct API URL for production
export VITE_API_BASE_URL=https://whatsappdashboard-1.onrender.com

echo "🔧 Setting environment variables..."
echo "VITE_API_BASE_URL=$VITE_API_BASE_URL"

# 1. Install all dependencies
echo "📦 Installing all dependencies..."
npm install

# 2. Build the project with the correct API URL
echo "🔨 Building project with production API URL..."
npm run build

# 3. Verify the build
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📋 Build Summary:"
    echo "1. ✅ Dependencies installed"
    echo "2. ✅ Environment variables set"
    echo "3. ✅ TypeScript compilation successful"
    echo "4. ✅ Vite build completed with correct API URL"
    echo "5. ✅ Production files ready in dist/"
    echo ""
    echo "🔗 API URL configured: $VITE_API_BASE_URL"
    echo "📁 Built files:"
    echo "- dist/index.html"
    echo "- dist/assets/ (CSS, JS, images)"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Deploy to Render (backend + frontend)"
    echo "2. Test Support Calls page"
    echo "3. Test Inactive Vendors page"
    echo "4. Verify API calls go to production server"
    echo ""
    echo "✅ Deployment ready with API URL fix!"
else
    echo "❌ Build failed!"
    exit 1
fi
