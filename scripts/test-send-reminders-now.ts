import mongoose from 'mongoose';
import { Contact } from '../server/models/Contact.js';
import { User } from '../server/models/User.js';
import { createFreshClient } from '../server/twilio.js';
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
  const twilioClient = createFreshClient();
  
  if (!twilioClient) {
    console.error('❌ No Twilio client available - missing credentials');
    return false;
  }
  
  try {
    console.log(`📤 Sending reminder to ${phone}...`);
    
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
    return false;
  }
}

async function sendRemindersNow() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🚀 SENDING REMINDERS TO INACTIVE VENDORS NOW');
    console.log('=============================================');
    
    // Check environment variables
    console.log('\n🔧 Environment check:');
    console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Not set'}`);
    console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Not set'}`);
    console.log(`TWILIO_PHONE_NUMBER: ${TWILIO_NUMBER ? '✅ Set' : '❌ Not set'}`);
    
    // Find inactive contacts (3+ days)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    console.log(`\n📅 Finding vendors inactive since: ${threeDaysAgo.toISOString()}`);
    
    const inactiveContacts = await Contact.find({ lastSeen: { $lte: threeDaysAgo } });
    console.log(`📊 Found ${inactiveContacts.length} inactive contacts`);
    
    if (inactiveContacts.length === 0) {
      console.log('ℹ️ No inactive contacts found - all vendors are active!');
      return;
    }
    
    // Find vendors who haven't received reminders in last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReminders = await SupportCallReminderLog.find({ 
      sentAt: { $gte: since } 
    });
    
    const recentlyRemindedPhones = new Set(recentReminders.map(r => r.contactNumber));
    console.log(`📊 Vendors who received reminders in last 24h: ${recentlyRemindedPhones.size}`);
    
    // Filter vendors who need reminders
    const vendorsNeedingReminders = [];
    
    for (const contact of inactiveContacts) {
      const vendor = await User.findOne({ contactNumber: contact.phone });
      if (vendor && !recentlyRemindedPhones.has(contact.phone)) {
        vendorsNeedingReminders.push({ contact, vendor });
      }
    }
    
    console.log(`📊 Vendors needing reminders: ${vendorsNeedingReminders.length}`);
    
    if (vendorsNeedingReminders.length === 0) {
      console.log('ℹ️ All inactive vendors have already received reminders in the last 24 hours.');
      console.log('💡 The automatic reminder system is working correctly!');
      return;
    }
    
    // Send reminders to first 5 vendors (to avoid overwhelming)
    const vendorsToProcess = vendorsNeedingReminders.slice(0, 5);
    console.log(`\n📱 Sending reminders to ${vendorsToProcess.length} vendors...`);
    
    let sentCount = 0;
    let errorCount = 0;
    
    for (const { contact, vendor } of vendorsToProcess) {
      console.log(`\n📱 Processing ${vendor.name} (${contact.phone})...`);
      
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
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Sent: ${sentCount} reminders`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📱 Total vendors needing reminders: ${vendorsNeedingReminders.length}`);
    
    if (sentCount > 0) {
      console.log('\n🎉 Reminders sent successfully!');
      console.log('💡 The automatic reminder system is working correctly.');
      console.log('⏰ The scheduler runs daily at 10:00 AM to send reminders automatically.');
    }
    
  } catch (error) {
    console.error('❌ Error sending reminders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

sendRemindersNow();
