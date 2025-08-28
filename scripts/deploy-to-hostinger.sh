#!/bin/bash

echo "🚀 Building project for Hostinger deployment..."

# Build the project
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully"
    
    # Create deployment folder
    mkdir -p deployment
    
    # Copy dist contents to deployment folder
    cp -r dist/* deployment/
    
    # Create a visible htaccess file
    if [ -f "public/.htaccess" ]; then
        cp public/.htaccess deployment/htaccess.txt
        echo "✅ Created htaccess.txt for easy renaming on Hostinger"
    fi
    
    # Create deployment instructions
    cat > deployment/DEPLOYMENT_INSTRUCTIONS.txt << 'EOF'
DEPLOYMENT INSTRUCTIONS FOR HOSTINGER:

1. Upload all files from this folder to your public_html directory
2. Rename 'htaccess.txt' to '.htaccess' in your Hostinger file manager
3. Make sure .htaccess is in the root of public_html

If you can't see .htaccess files in Hostinger:
- Use FTP client (FileZilla, etc.) to upload
- Enable "Show hidden files" in your file manager
- Or manually create .htaccess with the content from htaccess.txt

The .htaccess file is essential for:
- React Router to work properly
- Security headers
- Asset caching
- File compression
EOF

    echo "✅ Deployment package ready in 'deployment' folder"
    echo "📁 Upload contents of 'deployment' folder to Hostinger public_html"
    echo "📝 See DEPLOYMENT_INSTRUCTIONS.txt for detailed steps"
    
else
    echo "❌ Build failed"
    exit 1
fi 