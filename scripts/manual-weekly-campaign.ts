import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import { createFreshClient } from '../server/twilio.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TEMPLATE_SID = 'HX5990e2eb62bbb374ac865ab6195fcfbe';
const MESSAGE_TYPE = 'weekly_vendor_message';

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
    
    // Log the message to database
    await Message.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.contactNumber,
      body: TEMPLATE_SID,
      direction: 'outbound',
      timestamp: new Date(),
      meta: { 
        type: MESSAGE_TYPE,
        vendorName: user.name,
        templateSid: TEMPLATE_SID,
        weekDay: new Date().getDay(),
        weekNumber: Math.ceil(new Date().getDate() / 7),
        campaignTrigger: 'manual_script'
      },
      twilioSid: result.sid
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
    
    // Log error to database
    await Message.create({
      from: 'system',
      to: user.contactNumber,
      body: `Failed to send ${MESSAGE_TYPE}: ${error.message}`,
      direction: 'outbound',
      timestamp: new Date(),
      meta: { 
        type: 'error',
        originalType: MESSAGE_TYPE,
        error: error.message,
        vendorName: user.name,
        campaignTrigger: 'manual_script'
      },
      errorCode: error.code,
      errorMessage: error.message
    });
    
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
    console.log('🚀 MANUAL TRIGGER: Weekly Vendor Message Campaign');
    console.log('================================================');
    console.log(`📅 Date: ${new Date().toLocaleString()}`);
    console.log(`📋 Template SID: ${TEMPLATE_SID}`);
    console.log(`📝 Message Type: ${MESSAGE_TYPE}`);
    console.log(`🔧 Trigger: Manual Script`);
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');
    
    // Initialize Twilio client
    const twilioClient = createFreshClient();
    console.log('✅ Twilio client initialized');
    
    // Get all vendors (users)
    const vendors = await User.find({}).sort({ name: 1 });
    console.log(`📊 Found ${vendors.length} vendors to message`);
    
    if (vendors.length === 0) {
      console.log('❌ No vendors found in database');
      return;
    }
    
    // Check if we've already sent today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingMessages = await Message.find({
      'meta.type': MESSAGE_TYPE,
      timestamp: { $gte: today, $lt: tomorrow }
    });
    
    if (existingMessages.length > 0) {
      console.log(`⚠️  Already sent ${existingMessages.length} messages today.`);
      console.log('📋 Today\'s messages:');
      existingMessages.forEach(msg => {
        console.log(`   - ${msg.to} (${msg.meta?.vendorName || 'Unknown'}) - ${msg.twilioSid || 'No SID'}`);
      });
      
      const shouldContinue = process.argv.includes('--force');
      if (!shouldContinue) {
        console.log('💡 Use --force flag to send again today');
        return;
      } else {
        console.log('🔄 Force sending enabled - proceeding with campaign...');
      }
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
    
    // Log summary to database
    await Message.create({
      from: 'system',
      to: 'system',
      body: `Weekly vendor message campaign (MANUAL SCRIPT) summary: ${successCount} sent, ${errorCount} failed`,
      direction: 'outbound',
      timestamp: new Date(),
      meta: { 
        type: 'campaign_summary',
        campaignType: MESSAGE_TYPE,
        templateSid: TEMPLATE_SID,
        successCount,
        errorCount,
        totalCount: results.length,
        date: today.toISOString().split('T')[0],
        campaignTrigger: 'manual_script'
      }
    });
    
    // Show failed messages
    if (errorCount > 0) {
      console.log('\n❌ FAILED MESSAGES:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.vendorName} (${result.phone}): ${result.error}`);
      });
    }
    
    console.log('\n🎉 Manual campaign completed!');
    
  } catch (error) {
    console.error('❌ Error in weekly vendor message campaign:', error);
    
    // Log error to database
    try {
      await Message.create({
        from: 'system',
        to: 'system',
        body: `Weekly vendor message campaign error: ${error}`,
        direction: 'outbound',
        timestamp: new Date(),
        meta: { 
          type: 'campaign_error',
          campaignType: MESSAGE_TYPE,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          campaignTrigger: 'manual_script'
        }
      });
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the campaign
sendToAllVendors();
