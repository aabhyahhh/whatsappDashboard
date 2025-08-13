import path from 'path';
import dotenv from 'dotenv';
import twilio from 'twilio';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TEMPLATE_SID = 'HX5990e2eb62bbb374ac865ab6195fcfbe';
const MESSAGE_TYPE = 'weekly_vendor_message';

// Mock vendor data for testing (replace with actual vendor data)
const MOCK_VENDORS = [
  { name: 'Test Vendor 1', contactNumber: '+919876543210' },
  { name: 'Test Vendor 2', contactNumber: '+919876543211' },
  // Add more test vendors as needed
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

async function sendToAllVendors() {
  try {
    console.log('🚀 STARTING WEEKLY VENDOR MESSAGE CAMPAIGN (NO DB)');
    console.log('==================================================');
    console.log(`📅 Date: ${new Date().toLocaleString()}`);
    console.log(`📋 Template SID: ${TEMPLATE_SID}`);
    console.log(`📝 Message Type: ${MESSAGE_TYPE}`);
    console.log('⚠️  Running without database connection');
    
    // Check environment variables
    console.log('🔧 Checking Twilio credentials...');
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('Missing Twilio credentials');
    }
    
    // Create Twilio client
    console.log('🔧 Creating Twilio client...');
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized');
    
    // Use mock vendors for testing
    const vendors = MOCK_VENDORS;
    console.log(`📊 Found ${vendors.length} vendors to message (mock data)`);
    
    if (vendors.length === 0) {
      console.log('❌ No vendors found');
      return;
    }
    
    // Send messages to all vendors
    console.log('\n📤 Sending messages to all vendors...');
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
    console.log('\n📊 CAMPAIGN SUMMARY');
    console.log('==================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📊 Total: ${results.length}`);
    
    // Show failed messages
    if (errorCount > 0) {
      console.log('\n❌ FAILED MESSAGES:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.vendorName} (${result.phone}): ${result.error}`);
      });
    }
    
    console.log('\n🎉 Campaign completed!');
    console.log('💡 Note: This was a test run without database logging');
    
  } catch (error) {
    console.error('❌ Error in weekly vendor message campaign:', error);
  }
}

// Run the campaign
sendToAllVendors();
