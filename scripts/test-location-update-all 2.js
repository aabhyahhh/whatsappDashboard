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
const { client } = await import('../server/twilio.js');

async function testLocationUpdateAll() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('📍 Testing bulk location update send functionality...');
        
        // Get all users with valid contact numbers
        const allUsers = await User.find({ 
            contactNumber: { $exists: true, $ne: null, $ne: '' }
        }).select('name contactNumber _id').lean();
        
        console.log(`📊 Found ${allUsers.length} total users`);
        
        // Filter out users with invalid phone numbers
        const validVendors = allUsers.filter(user => 
            user.contactNumber && 
            user.contactNumber.length >= 10 && 
            !user.contactNumber.includes('...') &&
            !(user.contactNumber.includes('+91') && user.contactNumber.length < 13)
        );
        
        console.log(`📊 Found ${validVendors.length} valid vendors`);
        
        if (validVendors.length === 0) {
            console.log('✅ No valid vendors found - test completed');
            return;
        }
        
        // Show sample of valid vendors
        console.log('\n📋 Sample valid vendors:');
        validVendors.slice(0, 5).forEach((vendor, index) => {
            console.log(`   ${index + 1}. ${vendor.name} (${vendor.contactNumber})`);
        });
        
        if (validVendors.length > 5) {
            console.log(`   ... and ${validVendors.length - 5} more vendors`);
        }
        
        // Test sending to first 3 vendors only (for testing)
        const testVendors = validVendors.slice(0, 3);
        console.log(`\n🧪 Testing location update send to first ${testVendors.length} vendors only...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const vendor of testVendors) {
            try {
                if (client) {
                    const msgPayload = {
                        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                        to: `whatsapp:${vendor.contactNumber}`,
                        contentSid: 'HXbdb716843483717790c45c951b71701e', // Location update template
                        contentVariables: JSON.stringify({})
                    };
                    
                    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                        msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                    }
                    
                    console.log(`📤 Sending location update to ${vendor.name} (${vendor.contactNumber})...`);
                    const twilioResp = await client.messages.create(msgPayload);
                    console.log(`✅ Sent successfully: ${twilioResp.sid}`);
                    
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
            console.log('✅ Bulk location update functionality is working!');
        } else {
            console.log('❌ Bulk location update functionality failed');
        }
        
        console.log('\n📝 Template used: HXbdb716843483717790c45c951b71701e (Location Update)');
        
    } catch (error) {
        console.error('❌ Error testing bulk location update:', error);
        console.error('Error stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

testLocationUpdateAll();
