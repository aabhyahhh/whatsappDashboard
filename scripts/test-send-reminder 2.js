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

async function testSendReminder() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find a test vendor (first inactive vendor)
        const testVendor = await User.findOne({ 
            contactNumber: { $exists: true, $ne: null, $ne: '' }
        }).select('name contactNumber _id').lean();
        
        if (!testVendor) {
            console.error('❌ No test vendor found');
            return;
        }

        console.log(`📱 Testing send reminder for: ${testVendor.name} (${testVendor.contactNumber})`);
        
        // Test the send reminder functionality
        if (client) {
            try {
                const msgPayload = {
                    from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                    to: `whatsapp:${testVendor.contactNumber}`,
                    contentSid: 'HX4c78928e13eda15597c00ea0915f1f77', // Inactive vendor reminder template
                    contentVariables: JSON.stringify({})
                };
                
                if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                    msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                }
                
                console.log('📤 Sending reminder message...');
                const twilioResp = await client.messages.create(msgPayload);
                console.log('✅ Reminder sent successfully!');
                console.log(`   Twilio SID: ${twilioResp.sid}`);
                console.log(`   To: ${testVendor.contactNumber}`);
                console.log(`   Template: HX4c78928e13eda15597c00ea0915f1f77`);
                
                // Update vendor's reminder status
                await User.findByIdAndUpdate(testVendor._id, {
                    reminderStatus: 'Sent',
                    reminderSentAt: new Date()
                });
                console.log('✅ Updated vendor reminder status in database');
                
            } catch (twilioError) {
                console.error('❌ Failed to send reminder via Twilio:', twilioError);
                console.error('Error details:', twilioError.message);
            }
        } else {
            console.error('❌ Twilio client not initialized');
        }
        
    } catch (error) {
        console.error('❌ Error testing send reminder:', error);
        console.error('Error stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

testSendReminder();
