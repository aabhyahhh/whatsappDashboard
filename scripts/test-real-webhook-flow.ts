import 'dotenv/config';
import { connectDB } from '../server/db.js';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import SupportCallLog from '../server/models/SupportCallLog.js';
import { sendTemplateMessage } from '../server/meta.js';

async function testRealWebhookFlow() {
  try {
    await connectDB();
    console.log('🧪 Testing real webhook flow...');
    
    const testVendorPhone = '+918130026321';
    
    // Step 1: Send inactive vendors template
    console.log('\n📤 Step 1: Sending inactive vendors template...');
    const templateResult = await sendTemplateMessage(testVendorPhone, 'inactive_vendors_support_prompt_util');
    console.log('Template result:', templateResult ? '✅ Sent' : '❌ Failed');
    
    // Wait a moment for the message to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Simulate the webhook processing by calling the support conversation handler directly
    console.log('\n🔧 Step 2: Simulating webhook processing...');
    
    // Import the conversation engine handler
    const { handleSupportConversation } = await import('../server/routes/conversationEngine.js');
    
    // Call the support conversation handler directly
    await handleSupportConversation(testVendorPhone, 'yes');
    
    // Step 3: Check the results
    console.log('\n📊 Step 3: Checking results...');
    
    // Check support calls
    const supportCalls = await SupportCallLog.find({ contactNumber: testVendorPhone }).sort({ timestamp: -1 });
    console.log(`Total support calls: ${supportCalls.length}`);
    supportCalls.forEach((call, index) => {
      console.log(`  ${index + 1}. ${call.vendorName} - ${call.timestamp} - Completed: ${call.completed}`);
    });
    
    // Check recent messages
    const recentMessages = await Message.find({ 
      $or: [
        { from: testVendorPhone },
        { to: testVendorPhone }
      ]
    }).sort({ timestamp: -1 }).limit(3);
    
    console.log('\nRecent messages:');
    recentMessages.forEach((msg, i) => {
      console.log(`  ${i+1}. ${msg.direction} - ${msg.timestamp} - ${msg.body.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error in real webhook flow test:', error);
  }
}

// Run the test
testRealWebhookFlow()
  .then(() => {
    console.log('\n✅ Real webhook flow test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
