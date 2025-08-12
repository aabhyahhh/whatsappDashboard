import mongoose from 'mongoose';
import { Contact } from '../server/models/Contact.js';
import { User } from '../server/models/User.js';
import { client, createFreshClient } from '../server/twilio.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';
import path from 'path';
import dotenv from 'dotenv';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MESSAGE_TEMPLATE_ID = 'HX4c78928e13eda15597c00ea0915f1f77';
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const MONGO_URI = process.env.MONGODB_URI;

// Helper to send WhatsApp template message
async function sendSupportReminder(phone: string, vendorName: string | null = null) {
  // Try to get a working Twilio client
  let twilioClient = client;
  
  if (!twilioClient) {
    console.log('🔄 Creating fresh Twilio client...');
    twilioClient = createFreshClient();
  }
  
  if (!twilioClient) {
    console.error('❌ No Twilio client available - missing credentials');
    return false;
  }
  
  try {
    console.log(`📤 Attempting to send reminder to ${phone}...`);
    
    const messagePayload = {
      from: `whatsapp:${TWILIO_NUMBER}`,
      to: `whatsapp:${phone}`,
      contentSid: MESSAGE_TEMPLATE_ID
    };
    
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
      (messagePayload as any).messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    }
    
    const result = await twilioClient.messages.create(messagePayload);
    console.log(`✅ Sent support reminder to ${vendorName || phone} (${phone}) - SID: ${result.sid}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send to ${phone}:`, (err as any)?.message || err);
    
    // If it's an auth error, try creating a completely new client
    if ((err as any)?.code === 20003) {
      console.log('🔄 Attempting with completely fresh client due to auth error...');
      try {
        const newClient = createFreshClient();
        if (newClient) {
          const retryResult = await newClient.messages.create(messagePayload);
          console.log(`✅ Sent support reminder with fresh client to ${vendorName || phone} (${phone}) - SID: ${retryResult.sid}`);
          return true;
        }
      } catch (retryError) {
        console.error(`❌ Failed to send with fresh client to ${phone}:`, (retryError as any)?.message || retryError);
      }
    }
    return false;
  }
}

async function testAutomaticReminders() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧪 TESTING AUTOMATIC REMINDER SYSTEM');
    console.log('=====================================');
    
    // Check environment variables
    console.log('\n🔧 Checking environment variables...');
    console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Not set'}`);
    console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Not set'}`);
    console.log(`TWILIO_PHONE_NUMBER: ${TWILIO_NUMBER ? '✅ Set' : '❌ Not set'}`);
    console.log(`MESSAGE_TEMPLATE_ID: ${MESSAGE_TEMPLATE_ID}`);
    
    // Check Twilio client
    console.log('\n📱 Checking Twilio client...');
    if (!client) {
      console.log('🔄 Creating fresh Twilio client...');
      const freshClient = createFreshClient();
      if (!freshClient) {
        console.error('❌ Twilio client is null/undefined - missing credentials');
        return;
      }
      console.log('✅ Fresh Twilio client created');
    } else {
      console.log('✅ Twilio client available');
    }
    
    // Test 1: Find inactive contacts
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    console.log(`\n📅 Three days ago: ${threeDaysAgo.toISOString()}`);
    
    const inactiveContacts = await Contact.find({ lastSeen: { $lte: threeDaysAgo } });
    console.log(`📊 Found ${inactiveContacts.length} inactive contacts (not seen in 3+ days)`);
    
    if (inactiveContacts.length === 0) {
      console.log('ℹ️ No inactive contacts found. This might be normal if all vendors are active.');
      return;
    }
    
    // Test 2: Check which are registered vendors
    let inactiveVendors = 0;
    const vendorContacts = [];
    
    for (const contact of inactiveContacts) {
      const vendor = await User.findOne({ contactNumber: contact.phone });
      if (vendor) {
        inactiveVendors++;
        vendorContacts.push({ contact, vendor });
        
        if (inactiveVendors <= 5) {
          console.log(`  - ${vendor.name} (${contact.phone}) - Last seen: ${contact.lastSeen}`);
        }
      }
    }
    
    console.log(`\n📊 Found ${inactiveVendors} inactive contacts who are registered vendors`);
    
    if (inactiveVendors === 0) {
      console.log('ℹ️ No inactive vendors found. All inactive contacts are not registered vendors.');
      return;
    }
    
    // Test 3: Check recent reminders (last 24 hours)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReminders = await SupportCallReminderLog.find({ 
      sentAt: { $gte: since } 
    });
    
    console.log(`\n📊 Recent reminders (last 24h): ${recentReminders.length}`);
    if (recentReminders.length > 0) {
      console.log('Recent reminder logs:');
      recentReminders.slice(0, 5).forEach(log => {
        console.log(`  - ${log.contactNumber} - ${log.sentAt}`);
      });
    }
    
    // Test 4: Simulate the automatic reminder logic
    console.log('\n🚀 Simulating automatic reminder logic...');
    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const { contact, vendor } of vendorContacts.slice(0, 3)) { // Test with first 3 vendors
      console.log(`\n📱 Processing ${vendor.name} (${contact.phone})...`);
      
      // Check if already sent in last 24h
      const alreadySent = await SupportCallReminderLog.findOne({ 
        contactNumber: contact.phone, 
        sentAt: { $gte: since } 
      });
      
      if (alreadySent) {
        console.log(`⏩ Skipping ${vendor.name} (${contact.phone}), already sent in last 24h.`);
        skippedCount++;
        continue;
      }
      
      // Try to send reminder
      const sent = await sendSupportReminder(contact.phone, vendor.name);
      
      if (sent) {
        // Log the send
        await SupportCallReminderLog.create({ 
          contactNumber: contact.phone,
          sentAt: new Date()
        });
        sentCount++;
        console.log(`✅ Successfully sent and logged reminder for ${vendor.name}`);
      } else {
        errorCount++;
        console.log(`❌ Failed to send reminder for ${vendor.name}`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📊 Simulation summary:`);
    console.log(`✅ Sent: ${sentCount} reminders`);
    console.log(`⏩ Skipped: ${skippedCount} (already sent in 24h)`);
    console.log(`❌ Errors: ${errorCount}`);
    
    // Test 5: Check if scheduler is running
    console.log('\n⏰ Checking if scheduler is properly configured...');
    console.log('The scheduler should run daily at 10:00 AM with cron pattern: 0 10 * * *');
    console.log('Make sure the server is running continuously for the scheduler to work.');
    
  } catch (error) {
    console.error('❌ Error testing automatic reminders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testAutomaticReminders();
