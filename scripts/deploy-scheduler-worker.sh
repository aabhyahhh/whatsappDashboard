#!/bin/bash

# Deploy Scheduler Worker Script
# This script helps deploy the scheduler as a separate worker on Render

echo "🚀 Deploying WhatsApp Scheduler Worker..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Build the project
echo "📦 Building project..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed. dist directory not found."
    exit 1
fi

echo "✅ Build completed successfully"

# Create logs directory
mkdir -p logs

echo "📋 Deployment Instructions for Render:"
echo "======================================"
echo ""
echo "1. Create a new Worker service on Render"
echo "2. Connect your GitHub repository"
echo "3. Configure the following settings:"
echo ""
echo "   Service Type: Worker"
echo "   Build Command: npm install && npm run build"
echo "   Start Command: node dist/scripts/start-scheduler-worker.js"
echo "   Environment: Node"
echo ""
echo "4. Set the following environment variables:"
echo "   - TZ=Asia/Kolkata"
echo "   - NODE_ENV=production"
echo "   - MONGODB_URI=your_mongodb_connection_string"
echo "   - META_ACCESS_TOKEN=your_meta_access_token"
echo "   - META_PHONE_NUMBER_ID=your_meta_phone_number_id"
echo "   - META_VERIFY_TOKEN=your_meta_verify_token"
echo "   - META_APP_SECRET=your_meta_app_secret"
echo ""
echo "5. Deploy the worker"
echo ""
echo "📊 After deployment, check the logs for:"
echo "   - '✅ Mongo connected for scheduler'"
echo "   - '✅ FIXED Open-time location update scheduler started'"
echo "   - '✅ FIXED Inactive vendor support scheduler started'"
echo "   - '[SchedulerHeartbeat]' messages every 5 minutes"
echo ""
echo "🔍 To verify the scheduler is working:"
echo "   - Check logs for heartbeat messages"
echo "   - Look for 'Next inactive:' and 'Next location:' times"
echo "   - Monitor for actual message sending at scheduled times"
echo ""
echo "✅ Deployment script completed!"
