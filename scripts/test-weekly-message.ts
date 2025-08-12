import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import { createFreshClient } from '../server/twilio.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TEMPLATE_SID = 'HX5990e2eb62bbb374ac865ab6195fcfbe';
const MESSAGE_TYPE = 'weekly_vendor_message_test';

async function testWeeklyMessage() {
  try {
    console.log('🧪 TESTING WEEKLY VENDOR MESSAGE');
    console.log('=================================');
    console.log(`📋 Template SID: ${TEMPLATE_SID}`);
    console.log(`📝 Message Type: ${MESSAGE_TYPE}`);
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');
    
    // Initialize Twilio client
    const twilioClient = createFreshClient();
    console.log('✅ Twilio client initialized');
    
    // Get first 3 vendors for testing
    const vendors = await User.find({}).limit(3).sort({ name: 1 });
    console.log(`📊 Found ${vendors.length} vendors for testing`);
    
    if (vendors.length === 0) {
      console.log('❌ No vendors found in database');
      return;
    }
    
    console.log('\n📋 Vendors to test:');
    vendors.forEach((vendor, index) => {
      console.log(`${index + 1}. ${vendor.name} (${vendor.contactNumber})`);
    });
    
    // Send test messages
    console.log('\n📤 Sending test messages...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const vendor of vendors) {
      try {
        console.log(`\n📤 Sending to ${vendor.name} (${vendor.contactNumber})...`);
        
        const result = await twilioClient.messages.create({
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:${vendor.contactNumber}`,
          contentSid: TEMPLATE_SID,
          contentVariables: JSON.stringify({}),
        });
        
        // Log the message to database
        await Message.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: vendor.contactNumber,
          body: TEMPLATE_SID,
          direction: 'outbound',
          timestamp: new Date(),
          meta: { 
            type: MESSAGE_TYPE,
            vendorName: vendor.name,
            templateSid: TEMPLATE_SID,
            testRun: true
          },
          twilioSid: result.sid
        });
        
        console.log(`✅ Sent successfully to ${vendor.name} - SID: ${result.sid}`);
        successCount++;
        
      } catch (error: any) {
        console.error(`❌ Failed to send to ${vendor.name}: ${error.message}`);
        errorCount++;
        
        // Log error to database
        await Message.create({
          from: 'system',
          to: vendor.contactNumber,
          body: `Failed to send ${MESSAGE_TYPE}: ${error.message}`,
          direction: 'outbound',
          timestamp: new Date(),
          meta: { 
            type: 'error',
            originalType: MESSAGE_TYPE,
            error: error.message,
            vendorName: vendor.name,
            testRun: true
          },
          errorCode: error.code,
          errorMessage: error.message
        });
      }
      
      // Add delay between messages
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('===============');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📊 Total: ${vendors.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Test completed successfully!');
      console.log('💡 You can now run the full campaign with: node scripts/weekly-vendor-message-cron.js');
    } else {
      console.log('\n❌ Test failed. Please check your Twilio credentials and template.');
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testWeeklyMessage();
