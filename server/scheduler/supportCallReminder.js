import schedule from 'node-schedule';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { sendTemplateMessage } from '../meta.js';
import SupportCallReminderLog from '../models/SupportCallReminderLog.js';

// Connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';
  mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
}

// Helper to send inactive vendor support prompt
async function sendInactiveVendorSupportPrompt(phone, vendorName = null) {
  // Check if Meta WhatsApp API credentials are available
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.error('❌ Meta WhatsApp API credentials not available');
    return { success: false, error: 'Meta credentials not available' };
  }
  
  try {
    const result = await sendTemplateMessage(phone, 'inactive_vendors_support_prompt_util', []);
    if (result) {
      console.log(`✅ Sent inactive vendor support prompt to ${vendorName || phone} (${phone}) via Meta API`);
      return { success: true, messageId: result.messageId };
    } else {
      console.error(`❌ Failed to send to ${phone}: Template send failed`);
      return { success: false, error: 'Template send failed' };
    }
  } catch (err) {
    console.error(`❌ Failed to send to ${phone}:`, err?.message || err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

// Helper to check if vendor has replied to support prompt
async function hasRepliedToSupportPrompt(contactNumber) {
  const fiveDaysAgo = moment().tz('Asia/Kolkata').subtract(5, 'days').startOf('day').toDate();
  
  // Check if there's a recent support prompt sent
  const supportPrompt = await Message.findOne({
    to: contactNumber,
    direction: 'outbound',
    'meta.reminderType': 'support_prompt',
    timestamp: { $gte: fiveDaysAgo }
  }).sort({ timestamp: -1 });
  
  if (!supportPrompt) return false;
  
  // Check if vendor replied after the support prompt
  const reply = await Message.findOne({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    direction: 'inbound',
    timestamp: { $gte: supportPrompt.timestamp }
  });
  
  return !!reply;
}

// Schedule: every day at 10:00 AM IST
schedule.scheduleJob('0 10 * * *', async () => {
  const now = moment().tz('Asia/Kolkata');
  console.log('[SupportCallReminder] Running inactive vendor check...');
  console.log(`📅 Current time: ${now.format('YYYY-MM-DD HH:mm:ss')} IST`);
  
  // Check if Meta WhatsApp API credentials are available
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials - cannot send reminders');
    return;
  }
  
  const fiveDaysAgo = moment().tz('Asia/Kolkata').subtract(5, 'days').startOf('day').toDate();
  console.log(`📅 Five days ago: ${fiveDaysAgo.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  
  try {
    // Find contacts not seen in 5+ days
    const inactiveContacts = await Contact.find({ lastSeen: { $lte: fiveDaysAgo } });
    console.log(`📊 Found ${inactiveContacts.length} inactive contacts`);
    
    if (inactiveContacts.length === 0) {
      console.log('ℹ️ No inactive contacts found - all vendors are active!');
      return;
    }
    
    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const contact of inactiveContacts) {
      try {
        // Check if this contact is a registered vendor
        const vendor = await User.findOne({ contactNumber: contact.phone });
        const vendorName = vendor ? vendor.name : null;
        
        // Only send to registered vendors
        if (!vendor) {
          console.log(`⏩ Skipping ${contact.phone} - not a registered vendor`);
          skippedCount++;
          continue;
        }
        
        // Check if vendor has already replied to a support prompt
        const hasReplied = await hasRepliedToSupportPrompt(contact.phone);
        if (hasReplied) {
          console.log(`⏩ Skipping ${vendorName} (${contact.phone}) - already replied to support prompt`);
          skippedCount++;
          continue;
        }
        
        // Check if reminder was sent in last 24 hours
        const lastSent = await SupportCallReminderLog.findOne({ 
          contactNumber: contact.phone 
        }).sort({ sentAt: -1 });
        
        const shouldSendToday = !lastSent || 
          (now.valueOf() - lastSent.sentAt.getTime()) >= 24 * 60 * 60 * 1000; // 24 hours
        
        if (shouldSendToday) {
          console.log(`📱 Sending inactive vendor support prompt to ${vendorName} (${contact.phone})...`);
          const result = await sendInactiveVendorSupportPrompt(contact.phone, vendorName);
          
          if (result.success) {
            // Save the message to database
            await Message.create({
              from: process.env.META_PHONE_NUMBER_ID,
              to: contact.phone,
              body: 'Template: inactive_vendors_support_prompt_util',
              direction: 'outbound',
              timestamp: new Date(),
              meta: {
                reminderType: 'support_prompt',
                vendorName: vendorName,
                template: 'inactive_vendors_support_prompt_util'
              },
              messageId: result.messageId
            });
            
            await SupportCallReminderLog.create({ 
              contactNumber: contact.phone,
              sentAt: new Date()
            });
            sentCount++;
            console.log(`✅ Successfully sent and logged reminder for ${vendorName} (${contact.phone})`);
          } else {
            errorCount++;
            console.log(`❌ Failed to send reminder for ${vendorName} (${contact.phone}): ${result.error}`);
          }
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          const hoursSinceLastSent = Math.floor((now.valueOf() - lastSent.sentAt.getTime()) / (60 * 60 * 1000));
          console.log(`⏩ Skipping ${vendorName} (${contact.phone}), sent ${hoursSinceLastSent}h ago.`);
          skippedCount++;
        }
      } catch (contactError) {
        console.error(`❌ Error processing contact ${contact.phone}:`, contactError);
        errorCount++;
      }
    }
    
    console.log(`📊 Support reminder summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);
    
  } catch (err) {
    console.error('[SupportCallReminder] Error:', err?.message || err);
  }
});

console.log('✅ Support call reminder scheduler started (runs daily at 10:00 AM IST)');
console.log('📋 Scheduler will send reminders to vendors inactive for 5+ days');
console.log('🔄 Repeats daily until vendor replies');
console.log('🔧 Using Meta WhatsApp API for all messaging'); 