#!/bin/bash

# Meta WhatsApp Integration Deployment Script
# This script helps deploy the Meta WhatsApp integration

echo "🚀 Starting Meta WhatsApp Integration Deployment..."

# Check if environment variables are set
echo "🔍 Checking environment variables..."

if [ -z "$META_ACCESS_TOKEN" ]; then
    echo "❌ META_ACCESS_TOKEN is not set"
    exit 1
fi

if [ -z "$META_PHONE_NUMBER_ID" ]; then
    echo "❌ META_PHONE_NUMBER_ID is not set"
    exit 1
fi

if [ -z "$META_VERIFY_TOKEN" ]; then
    echo "❌ META_VERIFY_TOKEN is not set"
    exit 1
fi

echo "✅ Environment variables are set"

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Test Meta integration
echo "🧪 Testing Meta integration..."
npm run test:meta-integration

if [ $? -eq 0 ]; then
    echo "✅ Meta integration test passed"
else
    echo "❌ Meta integration test failed"
    exit 1
fi

# Start the server
echo "🚀 Starting server..."
npm start

echo "🎉 Meta WhatsApp Integration Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Configure webhook URL in Meta Business Manager: https://your-domain.com/api/meta-webhook"
echo "2. Set webhook verify token to match META_VERIFY_TOKEN"
echo "3. Test webhook with Meta's webhook testing tools"
echo "4. Monitor logs for any issues"
echo ""
echo "🔧 Available Commands:"
echo "- npm run test:meta-integration"
echo "- npm run send:location-update-meta"
echo "- npm run send:inactive-reminders-meta"
echo "- npm run send:welcome-messages"
echo "- npm run send:template-meta"
echo ""
echo "📚 Documentation: documentation/META_WHATSAPP_INTEGRATION.md"

