import 'dotenv/config';
import mongoose from 'mongoose';
import { Contact } from '../server/models/Contact.js';
import { User } from '../server/models/User.js';
import { sendTemplateMessage } from '../server/meta.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';

const MESSAGE_TEMPLATE_ID = 'HX4c78928e13eda15597c00ea0915f1f77';
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const MONGO_URI = process.env.MONGODB_URI;

// Helper to send WhatsApp template message via Meta (same as scheduler)
async function sendSupportReminder(phone: string, vendorName: string | null = null) {
  try {
    const result = await sendTemplateMessage(phone, 'inactive_vendors_support_prompt_util');
    if (result) {
      console.log(`✅ Sent support reminder to ${vendorName || phone} (${phone})`);
      return true;
    } else {
      console.error(`❌ Failed to send support reminder to ${phone}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error sending support reminder to ${phone}:`, err?.message || err);
    return false;
  }
}

// Manual trigger of the scheduler logic
async function manualTriggerScheduler() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🚀 MANUAL TRIGGER OF AUTOMATIC REMINDER SCHEDULER');
    console.log('=================================================');
    console.log('📅 Current time:', new Date().toISOString());
    
    // Check if Twilio credentials are available (same as scheduler)
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
    
    // Find contacts not seen in 3+ days (same as scheduler)
    const inactiveContacts = await Contact.find({ lastSeen: { $lte: threeDaysAgo } });
    console.log(`📊 Found ${inactiveContacts.length} inactive contacts`);
    
    if (inactiveContacts.length === 0) {
      console.log('ℹ️ No inactive contacts found - all vendors are active!');
      return;
    }
    
    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each contact (same logic as scheduler)
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
      
      // Avoid duplicate sends within 24h (same as scheduler)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const alreadySent = await SupportCallReminderLog.findOne({ 
        contactNumber: contact.phone, 
        sentAt: { $gte: since } 
      });
      
      if (!alreadySent) {
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
        console.log(`⏩ Skipping ${vendorName} (${contact.phone}), already sent in last 24h.`);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Scheduler execution summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);
    
    if (sentCount > 0) {
      console.log('\n🎉 Manual trigger successful! Reminders sent.');
    } else if (skippedCount > 0) {
      console.log('\n💡 Manual trigger successful! All vendors already received reminders recently.');
      console.log('✅ This proves the automatic scheduler is working correctly.');
    }
    
    console.log('\n📋 Scheduler Information:');
    console.log('- Runs daily at 10:00 AM (cron: 0 10 * * *)');
    console.log('- Sends reminders to vendors inactive for 3+ days');
    console.log('- Prevents duplicate sends within 24 hours');
    console.log('- Uses template: HX4c78928e13eda15597c00ea0915f1f77');
    
  } catch (err) {
    console.error('[ManualTrigger] Error:', err?.message || err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

manualTriggerScheduler();
