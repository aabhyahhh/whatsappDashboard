import 'dotenv/config';
import { connectDB } from '../server/db.js';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import SupportCallLog from '../server/models/SupportCallLog.js';
import { sendTemplateMessage } from '../server/meta.js';
import { handleSupportConversation } from '../server/routes/conversationEngine.js';

async function testFreshSupportCall() {
  try {
    await connectDB();
    console.log('🧪 Testing fresh support call flow...');
    
    const testVendorPhone = '+918130026321';
    
    // Step 1: Clear existing support calls for clean test
    console.log('\n🧹 Step 1: Clearing existing support calls...');
    await SupportCallLog.deleteMany({ contactNumber: testVendorPhone });
    console.log('✅ Cleared existing support calls');
    
    // Step 2: Send inactive vendors template
    console.log('\n📤 Step 2: Sending inactive vendors template...');
    const templateResult = await sendTemplateMessage(testVendorPhone, 'inactive_vendors_support_prompt_util');
    console.log('Template result:', templateResult ? '✅ Sent' : '❌ Failed');
    
    // Wait a moment for the message to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Simulate "yes" response
    console.log('\n🔧 Step 3: Simulating "yes" response...');
    await handleSupportConversation(testVendorPhone, 'yes');
    
    // Step 4: Check the results
    console.log('\n📊 Step 4: Checking results...');
    
    // Check support calls
    const supportCalls = await SupportCallLog.find({ contactNumber: testVendorPhone }).sort({ timestamp: -1 });
    console.log(`Total support calls: ${supportCalls.length}`);
    supportCalls.forEach((call, index) => {
      console.log(`  ${index + 1}. ${call.vendorName} - ${call.timestamp} - Completed: ${call.completed}`);
    });
    
    // Check recent messages for confirmation
    const recentMessages = await Message.find({ 
      to: testVendorPhone,
      direction: 'outbound'
    }).sort({ timestamp: -1 }).limit(2);
    
    console.log('\nRecent outbound messages:');
    recentMessages.forEach((msg, i) => {
      console.log(`  ${i+1}. ${msg.timestamp} - ${msg.body.substring(0, 50)}...`);
      if (msg.meta?.template) {
        console.log(`      Template: ${msg.meta.template}`);
      }
    });
    
    // Step 5: Test the support calls API endpoint
    console.log('\n🌐 Step 5: Testing support calls API...');
    try {
      const response = await fetch('http://localhost:5000/api/webhook/support-calls');
      if (response.ok) {
        const supportCallsData = await response.json();
        const testVendorCall = supportCallsData.find((call: any) => call.contactNumber === testVendorPhone);
        if (testVendorCall) {
          console.log('✅ Support call found in API:', {
            vendorName: testVendorCall.vendorName,
            contactNumber: testVendorCall.contactNumber,
            timestamp: testVendorCall.timestamp,
            completed: testVendorCall.completed
          });
        } else {
          console.log('❌ Support call not found in API');
        }
      } else {
        console.log('❌ API request failed:', response.status);
      }
    } catch (apiError) {
      console.log('⚠️ API test skipped (server not running):', apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Error in fresh support call test:', error);
  }
}

// Run the test
testFreshSupportCall()
  .then(() => {
    console.log('\n✅ Fresh support call test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
