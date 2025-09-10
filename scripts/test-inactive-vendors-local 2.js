import 'dotenv/config';
import mongoose from 'mongoose';

// Database connection
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
    console.error('❌ MONGODB_URI is not defined');
    process.exit(1);
}

// Import models
const { User } = await import('../server/models/User.js');
const { Message } = await import('../server/models/Message.js');

async function testInactiveVendorsLocal() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const startTime = Date.now();
        console.log('📊 Testing inactive vendors endpoint (3+ days) locally...');
        
        // Calculate the date 3 days ago (for 3+ days inactivity)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        // Get all users with contact numbers
        const allUsers = await User.find({ 
            contactNumber: { $exists: true, $ne: null, $ne: '' }
        }).select('name contactNumber createdAt').lean();
        
        console.log(`📊 Found ${allUsers.length} total users`);
        
        // Get all inbound messages (vendor interactions) from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const allInboundMessages = await Message.find({
            direction: 'inbound',
            timestamp: { $gte: thirtyDaysAgo }
        }).select('from timestamp').lean();
        
        console.log(`📊 Found ${allInboundMessages.length} inbound messages in last 30 days`);
        
        // Process users to find inactive ones (no interaction for 3+ days)
        const inactiveVendors = [];
        
        for (const user of allUsers) {
            try {
                // Find all interactions from this user
                const userInteractions = allInboundMessages.filter(msg => 
                    msg.from === user.contactNumber || msg.from === `whatsapp:${user.contactNumber}`
                );
                
                // Get the most recent interaction
                const lastInteraction = userInteractions.sort((a, b) => b.timestamp - a.timestamp)[0];
                
                // Calculate days since last interaction
                const lastSeen = lastInteraction ? lastInteraction.timestamp : user.createdAt;
                const daysInactive = Math.floor((new Date() - lastSeen) / (1000 * 60 * 60 * 24));
                
                // Check if user is inactive for 3+ days
                if (daysInactive >= 3) {
                    inactiveVendors.push({
                        _id: user._id,
                        name: user.name,
                        contactNumber: user.contactNumber,
                        lastSeen: lastSeen.toISOString(),
                        daysInactive: daysInactive,
                        reminderStatus: 'Not sent',
                        reminderSentAt: null
                    });
                }
            } catch (userError) {
                console.error(`Error processing user ${user.contactNumber}:`, userError);
                // Continue with other users
            }
        }
        
        // Sort by days inactive (least inactive first - ascending order)
        inactiveVendors.sort((a, b) => a.daysInactive - b.daysInactive);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ Found ${inactiveVendors.length} inactive vendors (3+ days) (${duration}ms)`);
        
        // Show first 10 inactive vendors
        console.log('\n📋 Sample inactive vendors:');
        inactiveVendors.slice(0, 10).forEach((vendor, index) => {
            console.log(`   ${index + 1}. ${vendor.name} (${vendor.contactNumber}) - ${vendor.daysInactive} days inactive`);
        });
        
        if (inactiveVendors.length > 10) {
            console.log(`   ... and ${inactiveVendors.length - 10} more vendors`);
        }
        
        // Show summary by inactivity ranges
        const summary = {
            '3-7 days': inactiveVendors.filter(v => v.daysInactive >= 3 && v.daysInactive <= 7).length,
            '8-14 days': inactiveVendors.filter(v => v.daysInactive >= 8 && v.daysInactive <= 14).length,
            '15-30 days': inactiveVendors.filter(v => v.daysInactive >= 15 && v.daysInactive <= 30).length,
            '30+ days': inactiveVendors.filter(v => v.daysInactive > 30).length
        };
        
        console.log('\n📊 Inactivity Summary:');
        Object.entries(summary).forEach(([range, count]) => {
            console.log(`   ${range}: ${count} vendors`);
        });
        
        console.log('\n🎯 Test completed successfully!');
        console.log('📤 Ready to deploy to production server.');
        
    } catch (error) {
        console.error('❌ Error testing inactive vendors:', error);
        console.error('Error stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

testInactiveVendorsLocal();
