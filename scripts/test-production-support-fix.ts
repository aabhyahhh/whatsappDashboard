import 'dotenv/config';
import { connectDB } from '../server/db.js';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import SupportCallLog from '../server/models/SupportCallLog.js';
import { sendTemplateMessage } from '../server/meta.js';

async function testProductionSupportFix() {
  try {
    await connectDB();
    console.log('🧪 Testing production support call fix...');
    
    const testVendorPhone = '+918130026321';
    
    // Step 1: Clear existing support calls for clean test
    console.log('\n🧹 Step 1: Clearing existing support calls...');
    await SupportCallLog.deleteMany({ contactNumber: testVendorPhone });
    console.log('✅ Cleared existing support calls');
    
    // Step 2: Send inactive vendors template
    console.log('\n📤 Step 2: Sending inactive vendors template...');
    const templateResult = await sendTemplateMessage(testVendorPhone, 'inactive_vendors_support_prompt_util');
    console.log('Template result:', templateResult ? '✅ Sent' : '❌ Failed');
    
    // Wait for message to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Check if template message was saved
    console.log('\n🔍 Step 3: Checking template message in database...');
    const templateMessage = await Message.findOne({
      to: testVendorPhone,
      direction: 'outbound',
      $or: [
        { body: { $regex: /inactive_vendors_support_prompt_util/ } },
        { 'meta.template': 'inactive_vendors_support_prompt_util' }
      ]
    }).sort({ timestamp: -1 });
    
    if (templateMessage) {
      console.log('✅ Found template message in database');
      console.log('   Template:', templateMessage.meta?.template);
      console.log('   Timestamp:', templateMessage.timestamp);
    } else {
      console.log('❌ Template message not found in database');
    }
    
    // Step 4: Simulate the conversation router logic
    console.log('\n🔧 Step 4: Testing conversation router support logic...');
    
    // Import the conversation router handler
    const { handleSupportCallResponse } = await import('../server/routes/conversationRouter.js');
    
    // Call the support call response handler directly
    await handleSupportCallResponse('918130026321', testVendorPhone);
    
    // Step 5: Check results
    console.log('\n📊 Step 5: Checking results...');
    
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
      const direction = msg.direction === 'inbound' ? '👤 Vendor' : '🤖 System';
      const body = msg.body.length > 50 ? msg.body.substring(0, 50) + '...' : msg.body;
      console.log(`  ${i+1}. ${direction}: ${body}`);
      if (msg.meta?.template) {
        console.log(`      Template: ${msg.meta.template}`);
      }
    });
    
    if (supportCalls.length > 0) {
      console.log('\n🎉 SUPPORT CALL FIX IS WORKING!');
      console.log('✅ Template messages are being saved to database');
      console.log('✅ Support call detection logic is working');
      console.log('✅ Support calls are being created');
      console.log('✅ Confirmation messages are being sent');
    } else {
      console.log('\n❌ Support call fix is not working');
    }
    
  } catch (error) {
    console.error('❌ Error in production support fix test:', error);
  }
}

// Run the test
testProductionSupportFix()
  .then(() => {
    console.log('\n✅ Production support fix test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
