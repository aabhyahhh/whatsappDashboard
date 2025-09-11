import 'dotenv/config';
import { connectDB } from '../server/db.js';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import SupportCallLog from '../server/models/SupportCallLog.js';
import { sendTemplateMessage } from '../server/meta.js';

async function testSupportCallFlow() {
  try {
    await connectDB();
    console.log('🧪 Testing support call flow...');
    
    const testVendorPhone = '+918130026321';
    
    // Step 1: Send inactive vendors template (simulate what we did earlier)
    console.log('\n📤 Step 1: Sending inactive vendors template...');
    const templateResult = await sendTemplateMessage(testVendorPhone, 'inactive_vendors_support_prompt_util');
    console.log('Template result:', templateResult ? '✅ Sent' : '❌ Failed');
    
    // Step 2: Simulate a "yes" response by creating a message in the database
    console.log('\n📝 Step 2: Simulating "yes" response...');
    const yesMessage = new Message({
      from: testVendorPhone,
      to: process.env.META_PHONE_NUMBER_ID,
      body: 'yes',
      direction: 'inbound',
      timestamp: new Date(),
      meta: {
        messageId: `test_${Date.now()}`,
        type: 'text'
      }
    });
    await yesMessage.save();
    console.log('✅ Created "yes" message in database');
    
    // Step 3: Check if there's a recent support reminder
    console.log('\n🔍 Step 3: Checking for recent support reminder...');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSupportReminder = await Message.findOne({
      to: testVendorPhone,
      direction: 'outbound',
      body: { $regex: /inactive_vendors_support_prompt_util/ },
      timestamp: { $gte: oneHourAgo }
    });
    
    if (recentSupportReminder) {
      console.log('✅ Found recent support reminder');
      console.log('Reminder details:', {
        id: recentSupportReminder._id,
        timestamp: recentSupportReminder.timestamp,
        body: recentSupportReminder.body
      });
    } else {
      console.log('❌ No recent support reminder found');
    }
    
    // Step 4: Check if vendor exists in User collection
    console.log('\n👤 Step 4: Checking vendor in User collection...');
    const userNumbers = [testVendorPhone];
    if (testVendorPhone.startsWith('+91')) userNumbers.push(testVendorPhone.replace('+91', '91'));
    if (testVendorPhone.startsWith('+')) userNumbers.push(testVendorPhone.substring(1));
    userNumbers.push(testVendorPhone.slice(-10));
    
    const vendor = await User.findOne({ contactNumber: { $in: userNumbers } });
    if (vendor) {
      console.log('✅ Found vendor:', vendor.name);
    } else {
      console.log('❌ Vendor not found in User collection');
      console.log('Searched for numbers:', userNumbers);
    }
    
    // Step 5: Check existing support calls
    console.log('\n📞 Step 5: Checking existing support calls...');
    const existingSupportCall = await SupportCallLog.findOne({
      contactNumber: testVendorPhone,
      timestamp: { $gte: oneHourAgo }
    });
    
    if (existingSupportCall) {
      console.log('✅ Found existing support call:', existingSupportCall);
    } else {
      console.log('ℹ️ No existing support call found');
    }
    
    // Step 6: Manually trigger the support call logic
    console.log('\n🔧 Step 6: Manually triggering support call logic...');
    if (recentSupportReminder && vendor && !existingSupportCall) {
      console.log('Creating support call log...');
      const supportCall = new SupportCallLog({
        vendorName: vendor.name,
        contactNumber: testVendorPhone,
        timestamp: new Date(),
        completed: false
      });
      await supportCall.save();
      console.log('✅ Created support call log:', supportCall._id);
      
      // Send confirmation message
      console.log('Sending confirmation message...');
      const confirmationResult = await sendTemplateMessage(testVendorPhone, 'inactive_vendors_reply_to_yes_support_call_util');
      console.log('Confirmation result:', confirmationResult ? '✅ Sent' : '❌ Failed');
    } else {
      console.log('⚠️ Skipping support call creation due to missing requirements');
    }
    
    // Step 7: Check final state
    console.log('\n📊 Step 7: Final state check...');
    const allSupportCalls = await SupportCallLog.find({ contactNumber: testVendorPhone }).sort({ timestamp: -1 });
    console.log(`Total support calls for ${testVendorPhone}: ${allSupportCalls.length}`);
    allSupportCalls.forEach((call, index) => {
      console.log(`  ${index + 1}. ${call.vendorName} - ${call.timestamp} - Completed: ${call.completed}`);
    });
    
  } catch (error) {
    console.error('❌ Error in support call flow test:', error);
  }
}

// Run the test
testSupportCallFlow()
  .then(() => {
    console.log('\n✅ Support call flow test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
