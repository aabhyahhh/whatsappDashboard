import schedule from 'node-schedule';
import mongoose from 'mongoose';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import { sendTemplateMessage } from '../meta.js';
import SupportCallReminderLog from '../models/SupportCallReminderLog.js';

const SUPPORT_TEMPLATE_ID = 'HX4c78928e13eda15597c00ea0915f1f77';
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';
  mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
}

// Helper to send WhatsApp template message
async function sendSupportReminder(phone, vendorName = null) {
  // Check if Meta WhatsApp API credentials are available
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.error('❌ Meta WhatsApp API credentials not available');
    return false;
  }
  
  try {
    const result = await sendTemplateMessage(phone, 'post_support_call_message_for_vendors', []);
    console.log(`✅ Sent support reminder to ${vendorName || phone} (${phone}) via Meta API`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send to ${phone}:`, err?.message || err);
    return false;
  }
}

// Schedule: every day at 10:00 AM IST
schedule.scheduleJob('0 10 * * *', async () => {
  console.log('[SupportCallReminder] Running inactive vendor check...');
  console.log(`📅 Current time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  
  // Check if Twilio credentials are available
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !TWILIO_NUMBER) {
    console.error('❌ Missing Twilio credentials - cannot send reminders');
    return;
  }
  
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  console.log(`📅 Three days ago: ${threeDaysAgo.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  
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
      
      // Check if reminder was sent in last 24 hours
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

console.log('✅ Support call reminder scheduler started (runs daily at 10:00 AM IST)');
console.log('📋 Scheduler will send reminders to vendors inactive for 3+ days');
console.log('🔧 Template ID:', SUPPORT_TEMPLATE_ID); 