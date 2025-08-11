import schedule from 'node-schedule';
import mongoose from 'mongoose';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import { client } from '../twilio.js';
import SupportCallReminderLog from '../models/SupportCallReminderLog.js';

const MESSAGE_TEMPLATE_ID = 'HX4c78928e13eda15597c00ea0915f1f77';
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';

// Connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
}

// Helper to send WhatsApp template message
async function sendSupportReminder(phone, vendorName = null) {
  if (!client) return;
  try {
    await client.messages.create({
      from: `whatsapp:${TWILIO_NUMBER}`,
      to: `whatsapp:${phone}`,
      contentSid: MESSAGE_TEMPLATE_ID,
      contentVariables: JSON.stringify({})
    });
    console.log(`✅ Sent support reminder to ${vendorName || phone} (${phone})`);
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
    console.log(`📊 Found ${inactiveContacts.length} inactive contacts`);
    
    let sentCount = 0;
    let skippedCount = 0;
    
    for (const contact of inactiveContacts) {
      // Check if this contact is a registered vendor
      const vendor = await User.findOne({ contactNumber: contact.phone });
      const vendorName = vendor ? vendor.name : null;
      
      // Avoid duplicate sends within 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const alreadySent = await SupportCallReminderLog.findOne({ 
        contactNumber: contact.phone, 
        sentAt: { $gte: since } 
      });
      
      if (!alreadySent) {
        await sendSupportReminder(contact.phone, vendorName);
        await SupportCallReminderLog.create({ 
          contactNumber: contact.phone,
          sentAt: new Date()
        });
        sentCount++;
      } else {
        console.log(`⏩ Skipping ${vendorName || contact.phone} (${contact.phone}), already sent in last 24h.`);
        skippedCount++;
      }
    }
    
    console.log(`📊 Support reminder summary: ${sentCount} sent, ${skippedCount} skipped`);
    
  } catch (err) {
    console.error('[SupportCallReminder] Error:', err?.message || err);
  }
});

console.log('✅ Support call reminder scheduler started (runs every hour at minute 5)'); 