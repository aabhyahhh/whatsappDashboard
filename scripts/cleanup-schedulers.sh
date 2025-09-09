#!/bin/bash

echo "🧹 SCHEDULER CLEANUP SCRIPT"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "server/scheduler/metaSchedulerFixed.ts" ]; then
    echo "❌ Error: metaSchedulerFixed.ts not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "📊 Current scheduler files:"
ls -la server/scheduler/
echo ""

# Create backup directory
echo "📦 Creating backup directory..."
mkdir -p backups/scheduler/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/scheduler/$(date +%Y%m%d_%H%M%S)"

# Backup files before removal
echo "💾 Backing up files to $BACKUP_DIR..."
cp server/scheduler/metaScheduler.ts "$BACKUP_DIR/" 2>/dev/null || echo "⚠️ metaScheduler.ts not found (already removed?)"
cp server/scheduler/supportCallReminder.js "$BACKUP_DIR/" 2>/dev/null || echo "⚠️ supportCallReminder.js not found (already removed?)"
cp server/scheduler/profilePhotoAnnouncement.js "$BACKUP_DIR/" 2>/dev/null || echo "⚠️ profilePhotoAnnouncement.js not found (already removed?)"
cp server/scheduler/metaSchedulerFixed.ts "$BACKUP_DIR/"

echo "✅ Backup completed!"
echo ""

# Remove redundant files
echo "🗑️ Removing redundant scheduler files..."

if [ -f "server/scheduler/metaScheduler.ts" ]; then
    echo "   ❌ Removing metaScheduler.ts (broken, replaced by fixed version)"
    rm server/scheduler/metaScheduler.ts
fi

if [ -f "server/scheduler/supportCallReminder.js" ]; then
    echo "   ❌ Removing supportCallReminder.js (broken, replaced by fixed version)"
    rm server/scheduler/supportCallReminder.js
fi

if [ -f "server/scheduler/profilePhotoAnnouncement.js" ]; then
    echo "   ❌ Removing profilePhotoAnnouncement.js (expired campaign)"
    rm server/scheduler/profilePhotoAnnouncement.js
fi

echo ""

# Rename fixed scheduler to main scheduler
echo "🔄 Renaming metaSchedulerFixed.ts to metaScheduler.ts..."
mv server/scheduler/metaSchedulerFixed.ts server/scheduler/metaScheduler.ts

# Update server configuration
echo "📝 Updating server configuration..."
if [ -f "server/auth.ts" ]; then
    # Create a backup of auth.ts
    cp server/auth.ts "$BACKUP_DIR/auth.ts.backup"
    
    # Update the import statements
    sed -i.bak 's/metaSchedulerFixed\.js/metaScheduler.js/g' server/auth.ts
    sed -i.bak 's/supportCallReminder\.js/\/\/ supportCallReminder.js (removed)/g' server/auth.ts
    sed -i.bak 's/profilePhotoAnnouncement\.js/\/\/ profilePhotoAnnouncement.js (removed)/g' server/auth.ts
    
    # Remove backup file created by sed
    rm server/auth.ts.bak 2>/dev/null
    
    echo "✅ Server configuration updated!"
else
    echo "⚠️ Warning: server/auth.ts not found!"
fi

echo ""

# Show final state
echo "📊 Final scheduler directory:"
ls -la server/scheduler/
echo ""

# Show what was removed
echo "🗑️ Files removed:"
echo "   ❌ metaScheduler.ts (original broken version)"
echo "   ❌ supportCallReminder.js (original broken version)"
echo "   ❌ profilePhotoAnnouncement.js (expired campaign)"
echo ""

# Show what was kept
echo "✅ Files kept:"
echo "   ✅ metaScheduler.ts (renamed from metaSchedulerFixed.ts)"
echo ""

# Show backup location
echo "💾 Backup location: $BACKUP_DIR"
echo ""

echo "🎉 CLEANUP COMPLETE!"
echo "==================="
echo ""
echo "📈 IMPROVEMENTS:"
echo "   🚀 Reduced from 4 scheduler files to 1"
echo "   🚀 Removed 3 broken/expired schedulers"
echo "   🚀 Consolidated all functionality into single file"
echo "   🚀 Improved performance and resource utilization"
echo ""
echo "🔄 NEXT STEPS:"
echo "   1. Restart the server to apply changes"
echo "   2. Monitor logs to ensure scheduler is working"
echo "   3. Test message delivery to verify functionality"
echo ""
echo "⚠️ IMPORTANT:"
echo "   - Backup files are stored in: $BACKUP_DIR"
echo "   - If issues occur, restore from backup"
echo "   - Monitor system performance after restart"
echo ""
