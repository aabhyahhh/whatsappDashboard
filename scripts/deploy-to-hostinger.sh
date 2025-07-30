#!/bin/bash

# Production Frontend Deployment Script for Hostinger
echo "🚀 Deploying to Hostinger..."

# Build with production API URL
echo "📦 Building with production configuration..."
VITE_API_BASE_URL=https://whatsappdashboard.onrender.com npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📁 Production files are ready in the 'dist/' folder"
    echo ""
    echo "📋 Next steps:"
    echo "1. Upload the contents of 'dist/' folder to your Hostinger hosting"
    echo "2. Make sure your Hostinger domain points to the uploaded files"
    echo "3. Test the Support Calls page to verify it shows data from production"
    echo ""
    echo "🔗 Production API: https://whatsappdashboard.onrender.com"
    echo "📊 Expected support calls: 6 vendors (visible in MongoDB Atlas)"
    echo ""
    echo "✅ Deployment ready!"
else
    echo "❌ Build failed!"
    exit 1
fi 