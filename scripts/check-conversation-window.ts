import 'dotenv/config';
import mongoose from 'mongoose';
import { Message } from '../server/models/Message.js';

async function checkConversationWindow() {
  console.log('🔍 Checking conversation window for phone number...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const phoneNumber = '+918130026321';
    const phoneVariants = [
      phoneNumber,
      phoneNumber.replace(/^\+/, ''),
      `whatsapp:${phoneNumber.replace(/^\+/, '')}`
    ];

    console.log('📱 Checking conversation window for:', phoneNumber);
    console.log('🔍 Phone variants:', phoneVariants);

    // Find the last inbound message from this phone number
    const lastInboundMessage = await Message.findOne({
      $or: [
        { from: { $in: phoneVariants } },
        { to: { $in: phoneVariants } }
      ],
      direction: 'inbound'
    }).sort({ timestamp: -1 });

    if (lastInboundMessage) {
      const lastMessageTime = lastInboundMessage.timestamp;
      const now = new Date();
      const timeDiff = now.getTime() - lastMessageTime.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      const minutesDiff = timeDiff / (1000 * 60);

      console.log('📊 Last inbound message found:');
      console.log(`- Time: ${lastMessageTime.toISOString()}`);
      console.log(`- Hours ago: ${hoursDiff.toFixed(2)}`);
      console.log(`- Minutes ago: ${minutesDiff.toFixed(2)}`);
      console.log(`- Within 24h window: ${hoursDiff < 24 ? '✅ YES' : '❌ NO'}`);

      if (hoursDiff >= 24) {
        console.log('\n⚠️ WARNING: Outside 24-hour window!');
        console.log('📋 Solutions:');
        console.log('1. Use template messages instead of free-form text');
        console.log('2. Wait for the recipient to send a message first');
        console.log('3. Use approved message templates');
      } else {
        console.log('\n✅ Within 24-hour window - free-form messages should work');
      }
    } else {
      console.log('❌ No inbound messages found from this phone number');
      console.log('📋 This means:');
      console.log('1. No conversation history exists');
      console.log('2. Only template messages can be sent');
      console.log('3. Free-form messages will fail');
    }

    // Check all messages for this phone number
    const allMessages = await Message.find({
      $or: [
        { from: { $in: phoneVariants } },
        { to: { $in: phoneVariants } }
      ]
    }).sort({ timestamp: -1 }).limit(10);

    console.log(`\n📊 Found ${allMessages.length} total messages for this phone number:`);
    allMessages.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg.direction} - ${msg.timestamp.toISOString()} - "${msg.body?.substring(0, 50)}..."`);
    });

    // Check recent outbound messages and their status
    const recentOutboundMessages = await Message.find({
      to: { $in: phoneVariants },
      direction: 'outbound',
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ timestamp: -1 });

    console.log(`\n📤 Recent outbound messages (last 24h): ${recentOutboundMessages.length}`);
    recentOutboundMessages.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg.timestamp.toISOString()} - Status: ${msg.deliveryStatus || 'unknown'} - "${msg.body?.substring(0, 50)}..."`);
      if (msg.errorMessage) {
        console.log(`   Error: ${msg.errorMessage}`);
      }
    });

  } catch (error) {
    console.error('❌ Error checking conversation window:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the check
checkConversationWindow().catch(console.error);
