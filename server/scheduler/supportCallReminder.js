import schedule from 'node-schedule';
import { Contact } from '../models/Contact.js';
import { client } from '../twilio.js';
import SupportCallReminderLog from '../models/SupportCallReminderLog.js';

const MESSAGE_TEMPLATE_ID = 'HX4c78928e13eda15597c00ea0915f1f77';
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Helper to send WhatsApp template message
async function sendSupportReminder(phone) {
  if (!client) return;
  try {
    await client.messages.create({
      from: `whatsapp:${TWILIO_NUMBER}`,
      to: `whatsapp:${phone}`,
      contentSid: MESSAGE_TEMPLATE_ID,
      contentVariables: JSON.stringify({})
    });
    console.log(`✅ Sent support reminder to ${phone}`);
  } catch (err) {
    console.error(`❌ Failed to send to ${phone}:`, err?.message || err);
  }
}

// Schedule: every hour at minute 5
schedule.scheduleJob('5 * * * *', async () => {
  console.log('[SupportCallReminder] Running inactive vendor check...');
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  try {
    // Find contacts not seen in 3+ days
    const inactiveContacts = await Contact.find({ lastSeen: { $lte: threeDaysAgo } });
    for (const contact of inactiveContacts) {
      // Avoid duplicate sends within 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const alreadySent = await SupportCallReminderLog.findOne({ contactNumber: contact.phone, sentAt: { $gte: since } });
      if (!alreadySent) {
        await sendSupportReminder(contact.phone);
        await SupportCallReminderLog.create({ contactNumber: contact.phone });
      } else {
        console.log(`⏩ Skipping ${contact.phone}, already sent in last 24h.`);
      }
    }
  } catch (err) {
    console.error('[SupportCallReminder] Error:', err?.message || err);
  }
}); 