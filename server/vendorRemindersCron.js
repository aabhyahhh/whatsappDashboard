import 'dotenv/config';
import cron from 'node-cron';
import moment from 'moment-timezone';
import { Message } from './models/Message.js';
import { User } from './models/User.js';
import { sendTemplateMessage, areMetaCredentialsAvailable } from './meta.js';

const TEMPLATE_NAME = 'location_update_reminder';

// Validate required environment variables
if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
  console.error('❌ Meta WhatsApp API credentials are not set');
  console.error('Required: META_ACCESS_TOKEN, META_PHONE_NUMBER_ID');
  process.exit(1);
}

// Helper: Check if a location was received from user today
async function hasLocationToday(contactNumber) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const messages = await Message.find({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    timestamp: { $gte: since },
    $or: [
      { 'location.latitude': { $exists: true } },
      { body: { $regex: /location|shared|updated|sent/i } }
    ]
  });
  return messages.length > 0;
}

// Helper: Check if a reminder was sent today
async function hasReminderSentToday(contactNumber, reminderType) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const messages = await Message.find({
    to: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    'meta.reminderType': reminderType,
    timestamp: { $gte: since }
  });
  return messages.length > 0;
}

// Helper: Check if vendor responded to 15-min reminder
async function hasRespondedTo15MinReminder(contactNumber) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  
  // Check if 15-min reminder was sent today
  const reminderSent = await Message.findOne({
    to: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    'meta.reminderType': 'vendor_location_15min',
    timestamp: { $gte: since }
  }).sort({ timestamp: -1 });
  
  if (!reminderSent) return false;
  
  // Check if vendor responded after the reminder was sent
  const response = await Message.findOne({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    timestamp: { $gte: reminderSent.timestamp },
    $or: [
      { 'location.latitude': { $exists: true } },
      { body: { $regex: /location|shared|updated|sent/i } }
    ]
  });
  
  return !!response;
}

const checkAndSendReminders = async () => {
  try {
    const now = moment().tz('Asia/Kolkata');
    console.log(`🕐 Running vendor reminders check at ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Validate Meta WhatsApp API credentials at runtime
    if (!areMetaCredentialsAvailable()) {
      console.error('❌ Meta WhatsApp API credentials not available - skipping reminders');
      return;
    }
    
    // Get all vendors with WhatsApp consent and operating hours
    const users = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $ne: null, $ne: '' },
      'operatingHours.openTime': { $exists: true, $ne: null }
    });
    
    console.log(`📊 Found ${users.length} vendors with WhatsApp consent and operating hours`);
    
    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        // Check if vendor is open today
        const today = now.day();
        if (!user.operatingHours.days || !user.operatingHours.days.includes(today)) {
          skippedCount++;
          continue;
        }
        
        // Parse opening time with multiple format support
        let openTime;
        try {
          openTime = moment.tz(user.operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
          
          if (!openTime.isValid()) {
            console.log(`⚠️ Invalid open time for ${user.contactNumber}: ${user.operatingHours.openTime}`);
            errorCount++;
            continue;
          }
        } catch (timeError) {
          console.error(`❌ Error parsing time for ${user.contactNumber}:`, timeError.message);
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
        const hasLocation = await hasLocationToday(user.contactNumber);
        if (hasLocation) {
          console.log(`⏩ Skipping reminders for ${user.name} (${user.contactNumber}) - location already shared today`);
          skippedCount++;
          continue;
        }
        
        // Send reminder 15 minutes before opening time (14-16 minute window)
        if (diff >= 14 && diff <= 16) {
          if (!(await hasReminderSentToday(user.contactNumber, 'vendor_location_15min'))) {
            try {
              const result = await sendTemplateMessage(user.contactNumber, TEMPLATE_NAME, []);
              
              await Message.create({
                from: process.env.META_PHONE_NUMBER_ID,
                to: user.contactNumber,
                body: `Template: ${TEMPLATE_NAME}`,
                direction: 'outbound',
                timestamp: new Date(),
                meta: { 
                  reminderType: 'vendor_location_15min',
                  vendorName: user.name,
                  openTime: user.operatingHours.openTime
                },
                messageId: result.messageId || 'meta-' + Date.now()
              });
              
              console.log(`✅ Sent 15-min reminder to ${user.name} (${user.contactNumber}) at ${now.format('HH:mm')}`);
              sentCount++;
            } catch (error) {
              console.error(`❌ Failed to send 15-min reminder to ${user.contactNumber}:`, error.message);
              errorCount++;
            }
          } else {
            console.log(`⏩ 15-min reminder already sent today to ${user.name} (${user.contactNumber})`);
            skippedCount++;
          }
        }
        
        // Send reminder at opening time (-2 to +2 minute window)
        if (diff >= -2 && diff <= 2) {
          // Check if vendor responded to 15-min reminder
          const respondedTo15Min = await hasRespondedTo15MinReminder(user.contactNumber);
          
          if (respondedTo15Min) {
            console.log(`⏩ Skipping open-time reminder for ${user.name} (${user.contactNumber}) - already responded to 15-min reminder`);
            skippedCount++;
          } else if (!(await hasReminderSentToday(user.contactNumber, 'vendor_location_open'))) {
            try {
              const result = await sendTemplateMessage(user.contactNumber, TEMPLATE_NAME, []);
              
              await Message.create({
                from: process.env.META_PHONE_NUMBER_ID,
                to: user.contactNumber,
                body: `Template: ${TEMPLATE_NAME}`,
                direction: 'outbound',
                timestamp: new Date(),
                meta: { 
                  reminderType: 'vendor_location_open',
                  vendorName: user.name,
                  openTime: user.operatingHours.openTime
                },
                messageId: result.messageId || 'meta-' + Date.now()
              });
              
              console.log(`✅ Sent open-time reminder to ${user.name} (${user.contactNumber}) at ${now.format('HH:mm')}`);
              sentCount++;
            } catch (error) {
              console.error(`❌ Failed to send open-time reminder to ${user.contactNumber}:`, error.message);
              errorCount++;
            }
          } else {
            console.log(`⏩ Open-time reminder already sent today to ${user.name} (${user.contactNumber})`);
            skippedCount++;
          }
        }
        
      } catch (userError) {
        console.error(`Error processing user ${user.contactNumber}:`, userError);
        errorCount++;
      }
    }
    
    if (sentCount > 0 || errorCount > 0) {
      console.log(`📊 Summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);
    }
    
  } catch (err) {
    console.error('❌ Error in vendor reminder cron job:', err);
  }
};

// Schedule the cron job to run every 2 minutes for better coverage
cron.schedule('*/2 * * * *', checkAndSendReminders);

// Daily backup reminder at 9 AM IST for vendors who haven't shared location
cron.schedule('0 9 * * *', async () => {
  try {
    const now = moment().tz('Asia/Kolkata');
    console.log(`🕐 Running daily backup reminder at ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Validate Meta WhatsApp API credentials at runtime
    if (!areMetaCredentialsAvailable()) {
      console.error('❌ Meta WhatsApp API credentials not available - skipping backup reminders');
      return;
    }
    
    const users = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $ne: null, $ne: '' }
    });
    
    let sentCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      try {
        // Check if vendor has already shared location today
        const hasLocation = await hasLocationToday(user.contactNumber);
        if (hasLocation) {
          skippedCount++;
          continue;
        }
        
        // Check if backup reminder already sent today
        if (await hasReminderSentToday(user.contactNumber, 'vendor_location_backup')) {
          skippedCount++;
          continue;
        }
        
        // Check if vendor responded to any reminder today
        const respondedTo15Min = await hasRespondedTo15MinReminder(user.contactNumber);
        if (respondedTo15Min) {
          console.log(`⏩ Skipping backup reminder for ${user.contactNumber} - already responded to 15-min reminder`);
          skippedCount++;
          continue;
        }
        
        try {
          const result = await sendTemplateMessage(user.contactNumber, TEMPLATE_NAME, []);
          
          await Message.create({
            from: process.env.META_PHONE_NUMBER_ID,
            to: user.contactNumber,
            body: `Template: ${TEMPLATE_NAME}`,
            direction: 'outbound',
            timestamp: new Date(),
            meta: { 
              reminderType: 'vendor_location_backup',
              vendorName: user.name
            },
            messageId: result.messageId || 'meta-' + Date.now()
          });
          
          console.log(`✅ Sent backup reminder to ${user.name} (${user.contactNumber})`);
          sentCount++;
        } catch (error) {
          console.error(`❌ Failed to send backup reminder to ${user.contactNumber}:`, error.message);
        }
        
      } catch (userError) {
        console.error(`Error processing backup reminder for ${user.contactNumber}:`, userError);
      }
    }
    
    console.log(`📊 Backup reminder summary: ${sentCount} sent, ${skippedCount} skipped`);
    
  } catch (err) {
    console.error('❌ Error in daily backup reminder:', err);
  }
});

console.log('✅ Vendor reminder cron job started - running every 2 minutes');
console.log('✅ Daily backup reminder scheduled at 9 AM IST');

export { checkAndSendReminders }; 