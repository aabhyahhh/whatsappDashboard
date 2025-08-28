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
        console.log('📊 Testing inactive vendors endpoint locally...');
        
        // Calculate the date 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        // Simple approach: Get all users and filter in memory
        const allUsers = await User.find({ 
            contactNumber: { $exists: true, $ne: null, $ne: '' }
        }).select('name contactNumber createdAt').lean();
        
        console.log(`📊 Found ${allUsers.length} total users`);
        
        // Get recent messages for all users
        const recentMessages = await Message.find({
            timestamp: { $gte: sevenDaysAgo },
            $or: [
                { direction: 'outbound', body: 'HXbdb716843483717790c45c951b71701e' },
                { direction: 'inbound' }
            ]
        }).select('from to direction timestamp meta').lean();
        
        console.log(`📊 Found ${recentMessages.length} recent messages`);
        
        // Process users to find inactive ones
        const inactiveVendors = [];
        
        for (const user of allUsers) {
            try {
                // Find location reminders sent to this user
                const locationReminders = recentMessages.filter(msg => 
                    msg.direction === 'outbound' && 
                    msg.body === 'HXbdb716843483717790c45c951b71701e' &&
                    (msg.to === user.contactNumber || msg.to === `whatsapp:${user.contactNumber}`)
                );
                
                // Find recent responses from this user
                const userResponses = recentMessages.filter(msg => 
                    msg.direction === 'inbound' &&
                    (msg.from === user.contactNumber || msg.from === `whatsapp:${user.contactNumber}`)
                );
                
                // Check if user is inactive (has reminders but no recent responses)
                if (locationReminders.length > 0) {
                    const lastReminder = locationReminders.sort((a, b) => b.timestamp - a.timestamp)[0];
                    const lastResponse = userResponses.sort((a, b) => b.timestamp - a.timestamp)[0];
                    
                    const isInactive = !lastResponse || lastResponse.timestamp < lastReminder.timestamp;
                    
                    if (isInactive) {
                        const lastSeen = lastResponse ? lastResponse.timestamp : user.createdAt;
                        const daysInactive = Math.floor((new Date() - lastSeen) / (1000 * 60 * 60 * 24));
                        
                        inactiveVendors.push({
                            _id: user._id,
                            name: user.name,
                            contactNumber: user.contactNumber,
                            lastSeen: lastSeen.toISOString(),
                            daysInactive: daysInactive,
                            reminderStatus: 'Sent',
                            reminderSentAt: lastReminder.timestamp.toISOString()
                        });
                    }
                }
            } catch (userError) {
                console.error(`Error processing user ${user.contactNumber}:`, userError);
                // Continue with other users
            }
        }
        
        // Sort by days inactive
        inactiveVendors.sort((a, b) => a.daysInactive - b.daysInactive);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ Found ${inactiveVendors.length} inactive vendors (${duration}ms)`);
        
        // Show first 5 inactive vendors
        console.log('\n📋 Sample inactive vendors:');
        inactiveVendors.slice(0, 5).forEach((vendor, index) => {
            console.log(`   ${index + 1}. ${vendor.name} (${vendor.contactNumber}) - ${vendor.daysInactive} days inactive`);
        });
        
        if (inactiveVendors.length > 5) {
            console.log(`   ... and ${inactiveVendors.length - 5} more vendors`);
        }
        
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
