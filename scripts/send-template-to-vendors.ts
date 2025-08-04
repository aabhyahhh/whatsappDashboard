import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import twilio from 'twilio';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
const TEMPLATE_SID = 'HX5990e2eb62bbb374ac865ab6195fcfbe';
const TEST_NUMBER = '+918130026321';

async function sendTemplateToVendors() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to development database');
    
    if (!accountSid || !authToken || !twilioNumber) {
      console.error('❌ Missing Twilio credentials');
      return;
    }

    const client = twilio(accountSid, authToken);
    
    // Step 1: Send to test number first
    console.log(`\n🧪 STEP 1: Sending template to test number ${TEST_NUMBER}`);
    try {
      const testMessage = await client.messages.create({
        from: `whatsapp:${twilioNumber}`,
        to: `whatsapp:${TEST_NUMBER}`,
        contentSid: TEMPLATE_SID,
        contentVariables: JSON.stringify({})
      });
      
      console.log(`✅ Test message sent successfully! SID: ${testMessage.sid}`);
      console.log('⏳ Waiting 5 seconds before proceeding to vendors...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error: any) {
      console.error(`❌ Failed to send test message:`, error.message);
      console.log('❌ Aborting vendor messages due to test failure');
      return;
    }
    
    // Step 2: Send to all vendors
    console.log(`\n📤 STEP 2: Sending template to all vendors`);
    
    // Get all vendors (users with contactNumber)
    const vendors = await User.find({ contactNumber: { $exists: true, $ne: null } });
    console.log(`📊 Found ${vendors.length} vendors`);
    
    let sentCount = 0;
    let failedCount = 0;
    
    for (const vendor of vendors) {
      console.log(`\n📱 Processing: ${vendor.name} (${vendor.contactNumber})`);
      
      try {
        const message = await client.messages.create({
          from: `whatsapp:${twilioNumber}`,
          to: `whatsapp:${vendor.contactNumber}`,
          contentSid: TEMPLATE_SID,
          contentVariables: JSON.stringify({})
        });
        
        console.log(`✅ Message sent successfully! SID: ${message.sid}`);
        sentCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        console.error(`❌ Failed to send to ${vendor.contactNumber}:`, error.message);
        failedCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Messages sent: ${sentCount}`);
    console.log(`❌ Messages failed: ${failedCount}`);
    console.log(`📋 Total vendors: ${vendors.length}`);
    
    // Show first few vendors for verification
    console.log(`\n📋 First 5 vendors processed:`);
    vendors.slice(0, 5).forEach(vendor => {
      console.log(`  - ${vendor.name}: ${vendor.contactNumber}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

sendTemplateToVendors(); 