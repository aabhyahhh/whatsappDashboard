import dotenv from 'dotenv';
import path from 'path';
import twilio from 'twilio';
import mongoose from 'mongoose';
import { Contact } from '../server/models/Contact.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TEMPLATE_SID = 'HX4c78928e13eda15597c00ea0915f1f77';
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function sendSupportReminders() {
  console.log('🚀 Starting support call reminders to inactive vendors...');
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.error('❌ Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in environment.');
    return;
  }

  const client = twilio(accountSid, authToken);
  console.log('✅ Twilio client initialized successfully');

  if (!FROM_NUMBER) {
    console.error('❌ TWILIO_PHONE_NUMBER not set.');
    return;
  }

  // Find vendors inactive for 3+ days
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  console.log(`📅 Finding vendors inactive since: ${threeDaysAgo.toISOString()}`);
  
  const inactiveContacts = await Contact.find({ lastSeen: { $lte: threeDaysAgo } });
  console.log(`📊 Found ${inactiveContacts.length} inactive vendors`);

  let sentCount = 0;
  let skippedCount = 0;

  for (const contact of inactiveContacts) {
    // Check if already sent in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alreadySent = await SupportCallReminderLog.findOne({ 
      contactNumber: contact.phone, 
      sentAt: { $gte: since } 
    });

    if (alreadySent) {
      console.log(`⏩ Skipping ${contact.phone} - already sent in last 24h`);
      skippedCount++;
      continue;
    }

    console.log(`📱 Sending to: ${contact.phone}`);

    const msgPayload: {
      from: string;
      to: string;
      contentSid: string;
      messagingServiceSid?: string;
    } = {
      from: `whatsapp:${FROM_NUMBER.replace('whatsapp:', '')}`,
      to: `whatsapp:${contact.phone}`,
      contentSid: TEMPLATE_SID,
    };

    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
      msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    }

    try {
      const response = await client.messages.create(msgPayload);
      console.log(`✅ Sent to ${contact.phone} - SID: ${response.sid}`);
      
      // Log the send
      await SupportCallReminderLog.create({ contactNumber: contact.phone });
      sentCount++;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`❌ Failed to send to ${contact.phone}:`, (err as Error).message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ Sent: ${sentCount} messages`);
  console.log(`⏩ Skipped: ${skippedCount} (already sent in 24h)`);
  console.log(`📱 Total inactive vendors: ${inactiveContacts.length}`);
}

async function main() {
  await connectDB();
  await sendSupportReminders();
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

main(); 