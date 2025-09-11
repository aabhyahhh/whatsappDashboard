import 'dotenv/config';
import { connectDB } from '../server/db.js';
import { Message } from '../server/models/Message.js';

async function checkRecentMessages() {
  try {
    await connectDB();
    console.log('🔍 Checking recent messages to test vendor...');
    
    const messages = await Message.find({ to: '+918130026321' }).sort({ timestamp: -1 }).limit(5);
    console.log(`Found ${messages.length} recent messages:`);
    
    messages.forEach((msg, i) => {
      console.log(`\n${i+1}. ${msg.direction} - ${msg.timestamp}`);
      console.log(`   Body: ${msg.body.substring(0, 200)}...`);
      console.log(`   Meta:`, JSON.stringify(msg.meta, null, 2));
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRecentMessages()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
