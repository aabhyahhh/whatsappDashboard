import schedule from 'node-schedule';
import mongoose from 'mongoose';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import { client, createFreshClient } from '../twilio.js';
import SupportCallReminderLog from '../models/SupportCallReminderLog.js';

const MESSAGE_TEMPLATE_ID = 'HX4c78928e13eda15597c00ea0915f1f77';
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';

// Connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
}

// Helper to send WhatsApp template message
async function sendSupportReminder(phone, vendorName = null) {
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
    const messagePayload = {
      from: `whatsapp:${TWILIO_NUMBER}`,
      to: `whatsapp:${phone}`,
      contentSid: MESSAGE_TEMPLATE_ID
    };
    
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
      messagePayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    }
    
    const result = await twilioClient.messages.create(messagePayload);
    console.log(`✅ Sent support reminder to ${vendorName || phone} (${phone}) - SID: ${result.sid}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send to ${phone}:`, err?.message || err);
    
    // If it's an auth error, try creating a completely new client
    if (err?.code === 20003) {
      console.log('🔄 Attempting with completely fresh client due to auth error...');
      try {
        const newClient = createFreshClient();
        if (newClient) {
          const retryResult = await newClient.messages.create(messagePayload);
          console.log(`✅ Sent support reminder with fresh client to ${vendorName || phone} (${phone}) - SID: ${retryResult.sid}`);
          return true;
        }
      } catch (retryError) {
        console.error(`❌ Failed to send with fresh client to ${phone}:`, retryError?.message || retryError);
      }
    }
    return false;
  }
}

// Schedule: every day at 10:00 AM
schedule.scheduleJob('0 10 * * *', async () => {
  console.log('[SupportCallReminder] Running inactive vendor check...');
  console.log(`📅 Current time: ${new Date().toISOString()}`);
  
  // Check if Twilio credentials are available
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !TWILIO_NUMBER) {
    console.error('❌ Missing Twilio credentials - cannot send reminders');
    console.error('Required environment variables:');
    console.error('- TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
    console.error('- TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
    console.error('- TWILIO_PHONE_NUMBER:', TWILIO_NUMBER ? '✅ Set' : '❌ Missing');
    return;
  }
  
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  console.log(`📅 Three days ago: ${threeDaysAgo.toISOString()}`);
  
  try {
    // Find contacts not seen in 3+ days
    const inactiveContacts = await Contact.find({ lastSeen: { $lte: threeDaysAgo } });
    console.log(`📊 Found ${inactiveContacts.length} inactive contacts`);
    
    if (inactiveContacts.length === 0) {
      console.log('ℹ️ No inactive contacts found - all vendors are active!');
      return;
    }
    
    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const contact of inactiveContacts) {
      // Check if this contact is a registered vendor
      const vendor = await User.findOne({ contactNumber: contact.phone });
      const vendorName = vendor ? vendor.name : null;
      
      // Only send to registered vendors
      if (!vendor) {
        console.log(`⏩ Skipping ${contact.phone} - not a registered vendor`);
        skippedCount++;
        continue;
      }
      
      // Send reminder every 24 hours to inactive vendors
      // Check if we should send today (based on last sent time)
      const lastSent = await SupportCallReminderLog.findOne({ 
        contactNumber: contact.phone 
      }).sort({ sentAt: -1 });
      
      const shouldSendToday = !lastSent || 
        (new Date() - lastSent.sentAt) >= 24 * 60 * 60 * 1000; // 24 hours
      
      if (shouldSendToday) {
        console.log(`📱 Sending reminder to ${vendorName} (${contact.phone})...`);
        const sent = await sendSupportReminder(contact.phone, vendorName);
        
        if (sent) {
          await SupportCallReminderLog.create({ 
            contactNumber: contact.phone,
            sentAt: new Date()
          });
          sentCount++;
          console.log(`✅ Successfully sent and logged reminder for ${vendorName} (${contact.phone})`);
        } else {
          errorCount++;
          console.log(`❌ Failed to send reminder for ${vendorName} (${contact.phone})`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        const hoursSinceLastSent = Math.floor((new Date() - lastSent.sentAt) / (60 * 60 * 1000));
        console.log(`⏩ Skipping ${vendorName} (${contact.phone}), sent ${hoursSinceLastSent}h ago.`);
        skippedCount++;
      }
    }
    
    console.log(`📊 Support reminder summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);
    
  } catch (err) {
    console.error('[SupportCallReminder] Error:', err?.message || err);
  }
});

console.log('✅ Support call reminder scheduler started (runs daily at 10:00 AM)');
console.log('📋 Scheduler will send reminders to vendors inactive for 3+ days');
console.log('🔧 Make sure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set in environment variables'); 