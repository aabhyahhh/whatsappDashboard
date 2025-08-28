import 'dotenv/config';
import cron from 'node-cron';
import moment from 'moment-timezone';
import { Message } from './models/Message.js';
import { User } from './models/User.js';
import { client, createFreshClient } from './twilio.js';

const TEMPLATE_SID = 'HXbdb716843483717790c45c951b71701e';

// Validate required environment variables
if (!process.env.TWILIO_PHONE_NUMBER) {
  console.error('❌ TWILIO_PHONE_NUMBER environment variable is not set');
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
      { body: { $regex: /location|shared|updated/i } }
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

const checkAndSendReminders = async () => {
  try {
    const now = moment().tz('Asia/Kolkata');
    console.log(`🕐 Running vendor reminders check at ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Get a fresh Twilio client
    const twilioClient = createFreshClient();
    if (!twilioClient) {
      console.error('❌ Twilio client not available - skipping reminders');
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
        
        // Parse opening time
        const openTime = moment.tz(user.operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
        if (!openTime.isValid()) {
          console.log(`⚠️ Invalid open time for ${user.contactNumber}: ${user.operatingHours.openTime}`);
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
          skippedCount++;
          continue;
        }
        
        // Send reminder 15 minutes before opening time
        if (diff >= 14 && diff <= 16) {
          if (!(await hasReminderSentToday(user.contactNumber, 'vendor_location_15min'))) {
            try {
              const result = await twilioClient.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: `whatsapp:${user.contactNumber}`,
                contentSid: TEMPLATE_SID,
                contentVariables: JSON.stringify({}),
              });
              
              await Message.create({
                from: process.env.TWILIO_PHONE_NUMBER,
                to: user.contactNumber,
                body: TEMPLATE_SID,
                direction: 'outbound',
                timestamp: new Date(),
                meta: { 
                  reminderType: 'vendor_location_15min',
                  vendorName: user.name,
                  openTime: user.operatingHours.openTime
                },
                twilioSid: result.sid
              });
              
              console.log(`✅ Sent 15-min reminder to ${user.name} (${user.contactNumber})`);
              sentCount++;
            } catch (error) {
              console.error(`❌ Failed to send 15-min reminder to ${user.contactNumber}:`, error.message);
              errorCount++;
            }
          } else {
            skippedCount++;
          }
        }
        
        // Send reminder at opening time
        if (diff >= -2 && diff <= 2) {
          if (!(await hasReminderSentToday(user.contactNumber, 'vendor_location_open'))) {
            try {
              const result = await twilioClient.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: `whatsapp:${user.contactNumber}`,
                contentSid: TEMPLATE_SID,
                contentVariables: JSON.stringify({}),
              });
              
              await Message.create({
                from: process.env.TWILIO_PHONE_NUMBER,
                to: user.contactNumber,
                body: TEMPLATE_SID,
                direction: 'outbound',
                timestamp: new Date(),
                meta: { 
                  reminderType: 'vendor_location_open',
                  vendorName: user.name,
                  openTime: user.operatingHours.openTime
                },
                twilioSid: result.sid
              });
              
              console.log(`✅ Sent open-time reminder to ${user.name} (${user.contactNumber})`);
              sentCount++;
            } catch (error) {
              console.error(`❌ Failed to send open-time reminder to ${user.contactNumber}:`, error.message);
              errorCount++;
            }
          } else {
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

// Schedule the cron job to run every minute
cron.schedule('* * * * *', checkAndSendReminders);

console.log('✅ Vendor reminder cron job started - running every minute');

export { checkAndSendReminders }; 