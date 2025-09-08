import schedule from 'node-schedule';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { sendTemplateMessage } from '../meta.js';
import SupportCallReminderLog from '../models/SupportCallReminderLog.js';
// @ts-ignore
import DispatchLog from '../models/DispatchLog.js';

// Connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';
  mongoose.connect(MONGO_URI);
}

// Helper to send WhatsApp template message via Meta
async function sendMetaTemplateMessage(phone: string, templateName: string, vendorName: string = null) {
  try {
    const result = await sendTemplateMessage(phone, templateName);
    if (result) {
      console.log(`✅ Sent ${templateName} to ${vendorName || phone} (${phone})`);
      return { success: true, messageId: result.messageId };
    } else {
      console.error(`❌ Failed to send ${templateName} to ${phone}`);
      return { success: false, error: 'Template send failed' };
    }
  } catch (err) {
    console.error(`❌ Error sending ${templateName} to ${phone}:`, err?.message || err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

// Helper to check if vendor has shared location today
async function hasLocationToday(contactNumber: string): Promise<boolean> {
  const todayStart = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const todayEnd = moment().tz('Asia/Kolkata').endOf('day').toDate();
  
  const locationMessage = await Message.findOne({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    direction: 'inbound',
    timestamp: { $gte: todayStart, $lt: todayEnd },
    $or: [
      { 'location.latitude': { $exists: true } },
      { body: { $regex: /location|shared|updated|sent/i } }
    ]
  });
  
  return !!locationMessage;
}

// Open-time Location Update Scheduler - runs every minute in Asia/Kolkata timezone
schedule.scheduleJob('* * * * *', async () => {
  const now = moment().tz('Asia/Kolkata');
  console.log(`[OpenTimeScheduler] Running at ${now.format('YYYY-MM-DD HH:mm:ss')} IST`);
  
  // Check if Meta credentials are available
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials - cannot send location updates');
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
    
    console.log(`📊 Found ${vendors.length} vendors with operating hours and WhatsApp consent`);
    
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
            console.log(`⚠️ Invalid open time for ${vendor.contactNumber}: ${operatingHours.openTime}`);
            errorCount++;
            continue;
          }
        } catch (timeError) {
          console.error(`❌ Error parsing time for ${vendor.contactNumber}:`, timeError.message);
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
          console.log(`⏩ Skipping ${vendor.name} (${vendor.contactNumber}) - location already shared today`);
          skippedCount++;
          continue;
        }
        
        // Send reminder exactly 15 minutes before opening time
        if (diff === 15) {
          const dispatchType = 'preOpen';
          
          try {
            // Check if already dispatched today using dispatch log
            const existingDispatch = await DispatchLog.findOne({
              vendorId: vendor._id,
              date: todayDate,
              type: dispatchType
            });
            
            if (existingDispatch) {
              console.log(`⏩ Skipping preOpen reminder for ${vendor.name} (${vendor.contactNumber}) - already sent today`);
              skippedCount++;
              continue;
            }
            
            console.log(`📍 Sending preOpen reminder to ${vendor.name} (${vendor.contactNumber}) - 15 mins before open time`);
            
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
                  reminderType: 'vendor_location_15min',
                  vendorName: vendor.name,
                  openTime: operatingHours.openTime,
                  dispatchType: dispatchType
                },
                messageId: result.messageId
              });
              
              sentCount++;
            } else {
              errorCount++;
            }
          } catch (dispatchError) {
            console.error(`❌ Error processing preOpen dispatch for ${vendor.contactNumber}:`, dispatchError);
            errorCount++;
          }
        }
        
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
              console.log(`⏩ Skipping open reminder for ${vendor.name} (${vendor.contactNumber}) - already sent today`);
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
                  dispatchType: dispatchType
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
      console.log(`📊 Open-time reminder summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);
    }
    
  } catch (err) {
    console.error('[OpenTimeScheduler] Error:', err?.message || err);
  }
});

console.log('✅ Open-time location update scheduler started');
console.log('📍 Runs every minute in Asia/Kolkata timezone');
console.log('📅 Sends update_location_cron_util exactly twice: T-15min and T');
console.log('🔒 Uses dispatch log with unique index to prevent duplicates');
console.log('🔧 Using Meta WhatsApp API for all messaging');

