import path from 'path';
import dotenv from 'dotenv';
import twilio from 'twilio';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TEMPLATE_SID = 'HX5990e2eb62bbb374ac865ab6195fcfbe';
const MESSAGE_TYPE = 'weekly_vendor_message';

// For the first campaign, we'll use a test number to verify it works
// Replace this with actual vendor numbers from your database
const TEST_VENDORS = [
  { name: 'Test Vendor 1', contactNumber: '+919876543210' },
  { name: 'Test Vendor 2', contactNumber: '+919876543211' },
];

interface SendResult {
  success: boolean;
  phone: string;
  vendorName: string;
  error?: string;
  twilioSid?: string;
}

async function sendMessageToVendor(twilioClient: any, user: any): Promise<SendResult> {
  try {
    console.log(`📤 Sending message to ${user.name} (${user.contactNumber})...`);
    
    const result = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${user.contactNumber}`,
      contentSid: TEMPLATE_SID,
      contentVariables: JSON.stringify({}),
    });
    
    console.log(`✅ Sent successfully to ${user.name} - SID: ${result.sid}`);
    
    return {
      success: true,
      phone: user.contactNumber,
      vendorName: user.name,
      twilioSid: result.sid
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to send to ${user.name} (${user.contactNumber}):`, error.message);
    
    return {
      success: false,
      phone: user.contactNumber,
      vendorName: user.name,
      error: error.message
    };
  }
}

async function triggerFirstCampaign() {
  try {
    console.log('🚀 TRIGGERING FIRST WEEKLY CAMPAIGN MESSAGE');
    console.log('==========================================');
    console.log(`📅 Date: ${new Date().toLocaleString()}`);
    console.log(`📋 Template SID: ${TEMPLATE_SID}`);
    console.log(`📝 Message Type: ${MESSAGE_TYPE}`);
    console.log('🎯 This is the FIRST message of the 7-day campaign');
    
    // Check environment variables
    console.log('🔧 Checking Twilio credentials...');
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('Missing Twilio credentials');
    }
    
    // Create Twilio client
    console.log('🔧 Creating Twilio client...');
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized');
    
    // Use test vendors for now
    const vendors = TEST_VENDORS;
    console.log(`📊 Found ${vendors.length} vendors to message (test data)`);
    
    if (vendors.length === 0) {
      console.log('❌ No vendors found');
      return;
    }
    
    // Send messages to all vendors
    console.log('\n📤 Sending FIRST campaign messages...');
    const results: SendResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const vendor of vendors) {
      const result = await sendMessageToVendor(twilioClient, vendor);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      // Add a small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n📊 FIRST CAMPAIGN SUMMARY');
    console.log('==========================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📊 Total: ${results.length}`);
    console.log(`📅 Campaign Day: 1 of 7`);
    
    // Show failed messages
    if (errorCount > 0) {
      console.log('\n❌ FAILED MESSAGES:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.vendorName} (${result.phone}): ${result.error}`);
      });
    }
    
    console.log('\n🎉 First campaign message completed!');
    console.log('📅 Next message will be sent in 24 hours');
    console.log('⏰ Cron job is running in the background');
    
  } catch (error) {
    console.error('❌ Error in first campaign message:', error);
  }
}

// Run the first campaign
triggerFirstCampaign();
