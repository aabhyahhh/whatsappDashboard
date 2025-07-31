import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { client } from '../server/twilio.js';
import { User } from '../server/models/User.js';
import Message from '../server/models/Message.js';
import type { MessageListInstanceCreateOptions } from 'twilio/lib/rest/api/v2010/account/message';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';
const TEST_NUMBER = '+918130026321'; // Your test number
const TEMPLATE_SID = 'HX4c78928e13eda15597c00ea0915f1f77';
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function sendTestMessage() {
  if (!client) {
    console.error('❌ Twilio client not initialized.');
    return;
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.error('❌ Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in environment.');
  } else if (!client) {
    console.error('❌ Twilio client not initialized.');
  }
  

  if (!FROM_NUMBER) {
    console.error('❌ TWILIO_PHONE_NUMBER not set.');
    return;
  }

  const msgPayload: MessageListInstanceCreateOptions = {
    from: `whatsapp:${FROM_NUMBER.replace('whatsapp:', '')}`,
    to: `whatsapp:${TEST_NUMBER}`,
    contentSid: TEMPLATE_SID,
    contentVariables: JSON.stringify({}),
  };

  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  }

  try {
    const response = await client.messages.create(msgPayload);
    console.log(`✅ Message sent to ${TEST_NUMBER}. SID: ${response.sid}`);
  } catch (err) {
    console.error('❌ Failed to send message:', (err as Error).message);
  }
}

async function main() {
  await connectDB();
  await sendTestMessage();
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

main(); 