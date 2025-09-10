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
const { client } = await import('../server/twilio.js');

async function testBulkReminder() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('📤 Testing bulk reminder send functionality...');
        
        // Get all inactive vendors (3+ days inactive)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Get all users with contact numbers
        const allUsers = await User.find({ 
            contactNumber: { $exists: true, $ne: null, $ne: '' }
        }).select('name contactNumber createdAt _id').lean();
        
        console.log(`📊 Found ${allUsers.length} total users`);
        
        // Get all inbound messages from the last 30 days
        const allInboundMessages = await Message.find({
            direction: 'inbound',
            timestamp: { $gte: thirtyDaysAgo }
        }).select('from timestamp').lean();
        
        console.log(`📊 Found ${allInboundMessages.length} inbound messages in last 30 days`);
        
        // Find inactive vendors
        const inactiveVendors = [];
        for (const user of allUsers) {
            // Skip users with invalid phone numbers
            if (!user.contactNumber || 
                user.contactNumber.length < 10 || 
                user.contactNumber.includes('...') ||
                user.contactNumber.includes('+91') && user.contactNumber.length < 13) {
                continue;
            }
            
            const userInteractions = allInboundMessages.filter(msg => 
                msg.from === user.contactNumber || msg.from === `whatsapp:${user.contactNumber}`
            );
            
            const lastInteraction = userInteractions.sort((a, b) => b.timestamp - a.timestamp)[0];
            const lastSeen = lastInteraction ? lastInteraction.timestamp : user.createdAt;
            const daysInactive = Math.floor((new Date() - lastSeen) / (1000 * 60 * 60 * 24));
            
            if (daysInactive >= 3) {
                inactiveVendors.push({
                    _id: user._id,
                    name: user.name,
                    contactNumber: user.contactNumber,
                    daysInactive: daysInactive
                });
            }
        }
        
        // Sort by days inactive (least inactive first - ascending order)
        inactiveVendors.sort((a, b) => a.daysInactive - b.daysInactive);
        
        console.log(`📊 Found ${inactiveVendors.length} inactive vendors (3+ days)`);
        
        if (inactiveVendors.length === 0) {
            console.log('✅ No inactive vendors found - test completed');
            return;
        }
        
        // Show sample of inactive vendors (sorted by least inactive first)
        console.log('\n📋 Sample inactive vendors (least inactive first):');
        inactiveVendors.slice(0, 5).forEach((vendor, index) => {
            console.log(`   ${index + 1}. ${vendor.name} (${vendor.contactNumber}) - ${vendor.daysInactive} days inactive`);
        });
        
        if (inactiveVendors.length > 5) {
            console.log(`   ... and ${inactiveVendors.length - 5} more vendors`);
        }
        
        // Test sending to first 3 vendors only (for testing)
        const testVendors = inactiveVendors.slice(0, 3);
        console.log(`\n🧪 Testing bulk send to first ${testVendors.length} vendors only...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const vendor of testVendors) {
            try {
                if (client) {
                    const msgPayload = {
                        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                        to: `whatsapp:${vendor.contactNumber}`,
                        contentSid: 'HX4c78928e13eda15597c00ea0915f1f77',
                        contentVariables: JSON.stringify({})
                    };
                    
                    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                        msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                    }
                    
                    console.log(`📤 Sending to ${vendor.name} (${vendor.contactNumber})...`);
                    const twilioResp = await client.messages.create(msgPayload);
                    console.log(`✅ Sent successfully: ${twilioResp.sid}`);
                    
                    // Update vendor's reminder status
                    await User.findByIdAndUpdate(vendor._id, {
                        reminderStatus: 'Sent',
                        reminderSentAt: new Date()
                    });
                    
                    successCount++;
                } else {
                    throw new Error('Twilio client not initialized');
                }
                
                // Small delay
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Failed to send to ${vendor.name}: ${error.message}`);
            }
        }
        
        console.log(`\n📊 Test results: ${successCount} successful, ${errorCount} failed`);
        
        if (successCount > 0) {
            console.log('✅ Bulk reminder functionality is working!');
        } else {
            console.log('❌ Bulk reminder functionality failed');
        }
        
    } catch (error) {
        console.error('❌ Error testing bulk reminder:', error);
        console.error('Error stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

testBulkReminder();
