import schedule from 'node-schedule';
import mongoose from 'mongoose';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { sendTemplateMessage } from '../meta.js';
import SupportCallReminderLog from '../models/SupportCallReminderLog.js';
import operatingHoursModel from '../models/operatingHoursModel.js';

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
      return true;
    } else {
      console.error(`❌ Failed to send ${templateName} to ${phone}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error sending ${templateName} to ${phone}:`, err?.message || err);
    return false;
  }
}

// Location Update Scheduler - runs every minute to check for vendors opening soon
schedule.scheduleJob('* * * * *', async () => {
  console.log('[MetaLocationScheduler] Running location update check...');
  console.log(`📅 Current time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  
  // Check if Meta credentials are available
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials - cannot send location updates');
    return;
  }
  
  try {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Get all vendors with operating hours
    const vendors = await User.find({ 
      contactNumber: { $exists: true, $nin: [null, ''] },
      operatingHours: { $exists: true, $ne: null }
    }).select('name contactNumber operatingHours').lean();
    
    console.log(`📊 Found ${vendors.length} vendors with operating hours`);
    
    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const vendor of vendors) {
      try {
        if (!vendor.operatingHours || !(vendor.operatingHours as any).length) {
          continue;
        }
        
        // Check if vendor is open today
        const todayHours = (vendor.operatingHours as any).find((hours: any) => hours.day === currentDay);
        if (!todayHours || !todayHours.isOpen) {
          continue;
        }
        
        const openTime = todayHours.openTime;
        const openTimeMinutes = openTime.hours * 60 + openTime.minutes;
        
        // Check if vendor is opening in 15 minutes or at open time
        const timeDiff = openTimeMinutes - currentTime;
        
        if (timeDiff === 15 || timeDiff === 0) {
          // Check if we've already sent a location update message today
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
          
          const existingMessage = await Message.findOne({
            to: vendor.contactNumber,
            direction: 'outbound',
            'meta.type': 'location_update',
            'meta.vendorId': vendor._id,
            timestamp: { $gte: todayStart, $lt: todayEnd }
          });
          
          if (existingMessage) {
            console.log(`⏩ Skipping ${vendor.name} (${vendor.contactNumber}) - location update already sent today`);
            skippedCount++;
            continue;
          }
          
          // Check if vendor has already sent their location today
          const vendorLocationMessage = await Message.findOne({
            from: vendor.contactNumber,
            direction: 'inbound',
            location: { $exists: true },
            timestamp: { $gte: todayStart, $lt: todayEnd }
          });
          
          if (vendorLocationMessage && timeDiff === 0) {
            console.log(`⏩ Skipping ${vendor.name} (${vendor.contactNumber}) - already sent location today`);
            skippedCount++;
            continue;
          }
          
          console.log(`📍 Sending location update to ${vendor.name} (${vendor.contactNumber}) - ${timeDiff === 15 ? '15 mins before' : 'at'} open time`);
          
          const sent = await sendMetaTemplateMessage(vendor.contactNumber, 'update_location_cron', vendor.name);
          
          if (sent) {
            // Save the message to database
            await Message.create({
              from: process.env.META_PHONE_NUMBER_ID,
              to: vendor.contactNumber,
              body: 'update_location_cron',
              direction: 'outbound',
              timestamp: new Date(),
              meta: {
                type: 'location_update',
                vendorName: vendor.name,
                vendorId: vendor._id,
                timeType: timeDiff === 15 ? '15_minutes_before' : 'at_open_time'
              }
            });
            
            sentCount++;
          } else {
            errorCount++;
          }
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (vendorError) {
        console.error(`❌ Error processing vendor ${vendor.contactNumber}:`, vendorError);
        errorCount++;
      }
    }
    
    if (sentCount > 0 || errorCount > 0) {
      console.log(`📊 Location update summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);
    }
    
  } catch (err) {
    console.error('[MetaLocationScheduler] Error:', err?.message || err);
  }
});

// Inactive Vendors Support Reminder Scheduler - runs daily at 10:00 AM IST
schedule.scheduleJob('0 10 * * *', async () => {
  console.log('[MetaSupportReminder] Running inactive vendor check...');
  console.log(`📅 Current time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  
  // Check if Meta credentials are available
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials - cannot send reminders');
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
        
        // Check if reminder was sent in last 24 hours
        const lastSent = await SupportCallReminderLog.findOne({ 
          contactNumber: contact.phone 
        }).sort({ sentAt: -1 });
        
        const shouldSendToday = !lastSent || 
          (new Date().getTime() - lastSent.sentAt.getTime()) >= 24 * 60 * 60 * 1000; // 24 hours
        
        if (shouldSendToday) {
          console.log(`📱 Sending support reminder to ${vendorName} (${contact.phone})...`);
          const sent = await sendMetaTemplateMessage(contact.phone, 'inactive_vendors_support_prompt', vendorName);
          
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
          const hoursSinceLastSent = Math.floor((new Date().getTime() - lastSent.sentAt.getTime()) / (60 * 60 * 1000));
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
    console.error('[MetaSupportReminder] Error:', err?.message || err);
  }
});

console.log('✅ Meta WhatsApp scheduler started');
console.log('📍 Location update scheduler: runs every minute to check for vendors opening soon');
console.log('📞 Support reminder scheduler: runs daily at 10:00 AM IST for inactive vendors (3+ days)');
console.log('🔧 Using Meta WhatsApp API for all messaging');

