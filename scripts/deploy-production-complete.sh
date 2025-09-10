#!/bin/bash

# Complete Production Deployment Script
echo "🚀 Complete Production Deployment Script"
echo "========================================"

# 1. Install all dependencies (including devDependencies)
echo "📦 Installing all dependencies..."
npm install

# 2. Build the project
echo "🔨 Building project..."
npm run build

# 3. Test the build
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📋 Deployment Checklist:"
    echo "1. ✅ All dependencies installed"
    echo "2. ✅ TypeScript compilation successful"
    echo "3. ✅ Vite build completed"
    echo "4. ✅ Production files ready in dist/"
    echo ""
    echo "🔗 Production API: https://whatsappdashboard-1.onrender.com"
    echo "📊 Expected support calls: 6 vendors"
    echo "📊 Expected inactive vendors: Available via /api/webhook/inactive-vendors"
    echo ""
    echo "📁 Files ready for deployment:"
    echo "- dist/index.html"
    echo "- dist/assets/ (CSS, JS, images)"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Deploy to Render (backend)"
    echo "2. Upload dist/ to Hostinger (frontend)"
    echo "3. Test Support Calls page"
    echo "4. Test Inactive Vendors page"
    echo ""
    echo "✅ Deployment ready!"
else
    echo "❌ Build failed!"
    exit 1
fi 