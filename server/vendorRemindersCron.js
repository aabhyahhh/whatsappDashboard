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
        const users = await User.find({ whatsappConsent: true });
        for (const user of users) {
          if (!user.operatingHours || !user.operatingHours.openTime) continue;
          const openTime = moment.tz(user.operatingHours.openTime, 'h:mm A', 'Asia/Kolkata');
          openTime.set({
            year: now.year(),
            month: now.month(),
            date: now.date(),
          });
          const diff = openTime.diff(now, 'minutes');
          console.log(`User: ${user.contactNumber}, Now: ${now.format()}, OpenTime: ${openTime.format()}, Diff: ${diff}`);

          // 15-minute window before openTime (send if within 15 minutes before openTime)
          if (diff <= 15 && diff > 0) {
            if (!(await hasReminderSentToday(user.contactNumber, 15))) {
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
              console.log(`Sent 15-min window reminder to ${user.contactNumber}`);
            }
          }

          // At openTime (diff == 0)
          if (diff === 0) {
            if (!(await hasReminderSentToday(user.contactNumber, 0))) {
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
              console.log(`Sent openTime reminder to ${user.contactNumber}`);
            }
          }
        }
      } catch (err) {
        console.error('Error in WhatsApp reminder cron job:', err);
      }
};

// Schedule the cron job to run every minute
// cron.schedule('* * * * *', checkAndSendReminders);

console.log('Vendor reminder cron job started.');

export { checkAndSendReminders }; 