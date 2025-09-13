// Set timezone before any imports that rely on Date
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

import 'dotenv/config';
import schedule from 'node-schedule';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { sendTemplateMessage } from '../meta.ts';
import SupportCallReminderLog from '../models/SupportCallReminderLog.js';
// @ts-ignore
import DispatchLog from '../models/DispatchLog.js';

// Ensure MongoDB connection before scheduling
async function ensureMongoConnection() {
  if (mongoose.connection.readyState === 0) {
    const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';
    await mongoose.connect(MONGO_URI, { 
      dbName: process.env.MONGODB_DB || undefined 
    });
    console.log('✅ Mongo connected for scheduler');
  }
}

// Helper to validate Meta credentials with improved error handling
let warnedMeta = false;
function validateMetaCredentials(): boolean {
  // Standardize environment variable names
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  const hasAccessToken = !!accessToken;
  const hasPhoneNumberId = !!phoneNumberId;
  
  if (!hasAccessToken || !hasPhoneNumberId) {
    if (!warnedMeta) {
      console.error('❌ META creds missing. Set META_ACCESS_TOKEN and META_PHONE_NUMBER_ID.');
      console.error('   Current status:', {
        META_ACCESS_TOKEN: hasAccessToken ? 'SET' : 'NOT_SET',
        META_PHONE_NUMBER_ID: hasPhoneNumberId ? 'SET' : 'NOT_SET'
      });
      warnedMeta = true;
    }
    return false;
  }
  
  warnedMeta = false;
  return true;
}

// Helper to send WhatsApp template message via Meta
async function sendMetaTemplateMessage(phone: string, templateName: string, vendorName: string = null) {
  try {
    // Validate credentials first
    if (!validateMetaCredentials()) {
      return { success: false, error: 'Meta credentials not configured' };
    }
    
    const result = await sendTemplateMessage(phone, templateName);
    if (result && result.messages && result.messages.length > 0) {
      const messageId = result.messages[0].id;
      console.log(`✅ Sent ${templateName} to ${vendorName || phone} (${phone}) - ID: ${messageId}`);
      return { success: true, messageId: messageId };
    } else {
      console.error(`❌ Failed to send ${templateName} to ${phone}: ${result?.error || 'Unknown error'}`);
      return { success: false, error: result?.error || 'Template send failed' };
    }
  } catch (err) {
    console.error(`❌ Error sending ${templateName} to ${phone}:`, err?.message || err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

// Helper to check if vendor has shared location today (improved detection)
async function hasLocationToday(contactNumber: string): Promise<boolean> {
  const start = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const end = moment().tz('Asia/Kolkata').endOf('day').toDate();
  
  const locationMessage = await Message.findOne({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    direction: 'inbound',
    timestamp: { $gte: start, $lt: end },
    $or: [
      { 'location.latitude': { $exists: true } },
      { type: 'location' }, // if you store a type field
      { body: { $regex: /location|shared|updated|sent/i } }
    ]
  }).lean();
  
  return !!locationMessage;
}

// Helper to check if vendor has replied to support prompt
async function hasRepliedToSupportPrompt(contactNumber: string): Promise<boolean> {
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

// ===== FIXED LOCATION UPDATE SCHEDULER =====
// Runs every minute and handles ALL time slots properly
const locationJob = schedule.scheduleJob('* * * * *', async () => {
  const now = moment().tz('Asia/Kolkata');
  
  // Only log every 10 minutes to reduce noise
  if (now.minute() % 10 === 0) {
    console.log(`[LocationScheduler] Running at ${now.format('YYYY-MM-DD HH:mm:ss')} IST`);
  }
  
  // Check if Meta credentials are available
  if (!validateMetaCredentials()) {
    if (now.minute() % 10 === 0) {
      console.error('❌ Missing Meta WhatsApp credentials - cannot send location updates');
    }
    return;
  }
  
  try {
    const currentTime = now.hour() * 60 + now.minute(); // Current time in minutes
    const currentDay = now.day(); // 0 = Sunday, 1 = Monday, etc.
    const todayDate = now.format('YYYY-MM-DD');
    
    // Get all vendors with operating hours and WhatsApp consent
    const vendors = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $nin: [null, ''] },
      operatingHours: { $exists: true, $ne: null }
    }).select('_id name contactNumber operatingHours').lean();
    
    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const vendor of vendors) {
      try {
        if (!vendor.operatingHours) {
          continue;
        }
        
        // Check if vendor is open today
        const operatingHours = vendor.operatingHours as any;
        if (!operatingHours.days || !operatingHours.days.includes(currentDay)) {
          continue;
        }
        
        // Parse open time with multiple format support
        let openTime;
        try {
          openTime = moment.tz(operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
          
          if (!openTime.isValid()) {
            console.warn(`⛔ Invalid openTime for ${vendor.name} ${vendor.contactNumber}:`, operatingHours.openTime);
            errorCount++;
            continue;
          }
        } catch (timeError) {
          console.warn(`⛔ Error parsing openTime for ${vendor.name} ${vendor.contactNumber}:`, operatingHours.openTime, timeError);
          errorCount++;
          continue;
        }
        
        openTime.set({
          year: now.year(),
          month: now.month(),
          date: now.date(),
        });
        
        const diff = openTime.diff(now, 'minutes');
        
        // Check if vendor has already shared location today
        const hasLocation = await hasLocationToday(vendor.contactNumber);
        if (hasLocation) {
          skippedCount++;
          continue;
        }
        
        // REMOVED: 15-minute reminder - now only sending at opening time
        
        // Send reminder exactly at opening time
        if (diff === 0) {
          const dispatchType = 'open';
          
          try {
            // Check if already dispatched today using dispatch log
            const existingDispatch = await DispatchLog.findOne({
              vendorId: vendor._id,
              date: todayDate,
              type: dispatchType
            });
            
            if (existingDispatch) {
              skippedCount++;
              continue;
            }
            
            // Check if vendor has already shared location today (skip second message if location shared)
            const hasLocation = await hasLocationToday(vendor.contactNumber);
            if (hasLocation) {
              console.log(`⏩ Skipping open-time reminder for ${vendor.name} (${vendor.contactNumber}) - location already shared today`);
              skippedCount++;
              continue;
            }
            
            console.log(`📍 Sending open reminder to ${vendor.name} (${vendor.contactNumber}) - at open time`);
            
            const result = await sendMetaTemplateMessage(vendor.contactNumber, 'update_location_cron_util', vendor.name);
            
            // Log to dispatch log
            await DispatchLog.create({
              vendorId: vendor._id,
              date: todayDate,
              type: dispatchType,
              messageId: result.messageId,
              success: result.success,
              error: result.error
            });
            
            if (result.success) {
              // Also save to Message collection for tracking
              await Message.create({
                from: process.env.META_PHONE_NUMBER_ID,
                to: vendor.contactNumber,
                body: 'Template: update_location_cron_util',
                direction: 'outbound',
                timestamp: new Date(),
                meta: {
                  reminderType: 'vendor_location_open',
                  vendorName: vendor.name,
                  openTime: operatingHours.openTime,
                  dispatchType: dispatchType,
                  success: true
                },
                messageId: result.messageId
              });
              
              sentCount++;
            } else {
              errorCount++;
            }
          } catch (dispatchError) {
            console.error(`❌ Error processing open dispatch for ${vendor.contactNumber}:`, dispatchError);
            errorCount++;
          }
        }
        
      } catch (vendorError) {
        console.error(`❌ Error processing vendor ${vendor.contactNumber}:`, vendorError);
        errorCount++;
      }
    }
    
    if (sentCount > 0 || errorCount > 0) {
      console.log(`📊 Location reminder summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);
    }
    
  } catch (err) {
    console.error('[LocationScheduler] Error:', err?.message || err);
  }
});

// ===== FIXED INACTIVE VENDOR SUPPORT SCHEDULER =====
// Runs daily at 10 AM IST to send support prompts to inactive vendors
const inactiveJob = schedule.scheduleJob('0 10 * * *', async () => {
  const now = moment().tz('Asia/Kolkata');
  console.log('[SupportScheduler] Running inactive vendor check...');
  console.log(`📅 Current time: ${now.format('YYYY-MM-DD HH:mm:ss')} IST`);
  
  // Check if Meta WhatsApp API credentials are available
  if (!validateMetaCredentials()) {
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
          const result = await sendMetaTemplateMessage(contact.phone, 'inactive_vendors_support_prompt_util', vendorName);
          
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
                template: 'inactive_vendors_support_prompt_util',
                success: true
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
    console.error('[SupportScheduler] Error:', err?.message || err);
  }
});

// Export job references for inspection
export const jobs = { 
  locationJob: locationJob as any, 
  inactiveJob: inactiveJob as any 
};

// Health check endpoint for monitoring
export function getSchedulerHealth() {
  return {
    status: 'running',
    locationJob: {
      nextInvocation: locationJob?.nextInvocation()?.toISOString() || 'not scheduled',
      running: !!locationJob
    },
    inactiveJob: {
      nextInvocation: inactiveJob?.nextInvocation()?.toISOString() || 'not scheduled', 
      running: !!inactiveJob
    },
    metaCredentials: validateMetaCredentials(),
    timestamp: new Date().toISOString()
  };
}

// Lightweight heartbeat log every 5 minutes
schedule.scheduleJob('*/5 * * * *', () => {
  const now = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
  console.log(`[SchedulerHeartbeat] ${now} IST | Next inactive: ${inactiveJob?.nextInvocation()} | Next location: ${locationJob?.nextInvocation()}`);
});

// Startup self-test for Meta credentials
(async () => {
  await ensureMongoConnection();
  
  if (validateMetaCredentials()) {
    console.log('🔐 Meta creds present. Scheduler will attempt sends when due.');
  }
})();

console.log('✅ FIXED Open-time location update scheduler started');
console.log('📍 Runs every minute in Asia/Kolkata timezone');
console.log('📅 Sends update_location_cron_util only once at opening time (T)');
console.log('🔒 Uses dispatch log with unique index to prevent duplicates');
console.log('🔧 Using Meta WhatsApp API for all messaging');
console.log('✅ FIXED Inactive vendor support scheduler started');
console.log('📋 Runs daily at 10 AM IST to send support prompts to inactive vendors');
console.log('🔄 Sends inactive_vendors_support_prompt_util to vendors inactive for 5+ days');
console.log('🔧 Using Meta WhatsApp API for all messaging');
