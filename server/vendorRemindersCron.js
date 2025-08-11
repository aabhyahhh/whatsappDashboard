import cron from 'node-cron';
import moment from 'moment-timezone';
import { Message } from './models/Message.js';
import { User } from './models/User.js';
import { client } from './twilio.js';

const TEMPLATE_SID = 'HXbdb716843483717790c45c951b71701e';

// Helper: Check if a location was received from user today
async function hasLocationToday(contactNumber) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const messages = await Message.find({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    'location.latitude': { $exists: true },
    timestamp: { $gte: since }
  });
  return messages.length > 0;
}

// Helper: Check if a reminder was sent today
async function hasReminderSentToday(contactNumber, minutesBefore) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const bodyRegex = new RegExp(TEMPLATE_SID, 'i');
  const messages = await Message.find({
    to: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    body: { $regex: bodyRegex },
    timestamp: { $gte: since },
    'meta.minutesBefore': minutesBefore
  });
  return messages.length > 0;
}

const checkAndSendReminders = async () => {
    try {
        const now = moment().tz('Asia/Kolkata');
        console.log(`🕐 Running vendor reminders check at ${now.format('YYYY-MM-DD HH:mm:ss')}`);
        
        const users = await User.find({ 
          whatsappConsent: true,
          contactNumber: { $exists: true, $ne: null },
          'operatingHours.openTime': { $exists: true, $ne: null }
        });
        
        console.log(`📊 Found ${users.length} vendors with WhatsApp consent and operating hours`);
        
        let sentCount = 0;
        let skippedCount = 0;
        
        for (const user of users) {
          if (!user.operatingHours || !user.operatingHours.openTime) {
            console.log(`⏩ Skipping ${user.contactNumber} - no operating hours`);
            continue;
          }
          
          // Parse the open time
          const openTime = moment.tz(user.operatingHours.openTime, 'h:mm A', 'Asia/Kolkata');
          openTime.set({
            year: now.year(),
            month: now.month(),
            date: now.date(),
          });
          
          const diff = openTime.diff(now, 'minutes');
          
          // Only log if the vendor is close to opening time (within 20 minutes)
          if (diff >= -5 && diff <= 20) {
            console.log(`📱 ${user.name} (${user.contactNumber}): Open at ${openTime.format('HH:mm')}, Diff: ${diff} minutes`);
          }

          // Send reminder 15 minutes before opening time
          if (diff === 15) {
            if (!(await hasReminderSentToday(user.contactNumber, 15))) {
              try {
                await client.messages.create({
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
                  meta: { minutesBefore: 15 }
                });
                console.log(`✅ Sent 15-min reminder to ${user.name} (${user.contactNumber})`);
                sentCount++;
              } catch (error) {
                console.error(`❌ Failed to send 15-min reminder to ${user.contactNumber}:`, error.message);
              }
            } else {
              console.log(`⏩ Skipping 15-min reminder for ${user.contactNumber} - already sent today`);
              skippedCount++;
            }
          }

          // Send reminder at opening time (diff == 0) - only if vendor hasn't shared location yet
          if (diff === 0) {
            // Check if vendor has already shared location today
            const hasLocation = await hasLocationToday(user.contactNumber);
            
            if (hasLocation) {
              console.log(`⏩ Skipping open-time reminder for ${user.contactNumber} - location already shared today`);
              skippedCount++;
            } else if (!(await hasReminderSentToday(user.contactNumber, 0))) {
              try {
                await client.messages.create({
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
                  meta: { minutesBefore: 0 }
                });
                console.log(`✅ Sent open-time reminder to ${user.name} (${user.contactNumber})`);
                sentCount++;
              } catch (error) {
                console.error(`❌ Failed to send open-time reminder to ${user.contactNumber}:`, error.message);
              }
            } else {
              console.log(`⏩ Skipping open-time reminder for ${user.contactNumber} - already sent today`);
              skippedCount++;
            }
          }
        }
        
        console.log(`📊 Vendor reminders summary: ${sentCount} sent, ${skippedCount} skipped`);
        
      } catch (err) {
        console.error('❌ Error in WhatsApp reminder cron job:', err);
      }
};

// Schedule the cron job to run every minute
cron.schedule('* * * * *', checkAndSendReminders);

console.log('✅ Vendor reminder cron job started and scheduled to run every minute.');

export { checkAndSendReminders }; 