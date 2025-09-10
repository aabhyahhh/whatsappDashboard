import 'dotenv/config';
import { sendTemplateMessage, sendTextMessage, sendInteractiveMessage } from '../server/meta.js';

async function testMetaIntegration() {
  console.log('🧪 Testing Meta WhatsApp integration...');
  
  // Test phone number (replace with a valid test number)
  const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '+919876543210';
  
  try {
    // Test 1: Send a text message
    console.log('\n📱 Test 1: Sending text message...');
    const textResult = await sendTextMessage(testPhoneNumber, 'Hello! This is a test message from Meta WhatsApp integration. 🚀');
    console.log('Text message result:', textResult);
    
    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Send an interactive message with buttons
    console.log('\n🔘 Test 2: Sending interactive message with buttons...');
    const interactiveResult = await sendInteractiveMessage(
      testPhoneNumber,
      'Please choose an option:',
      [
        { id: 'option1', title: 'Option 1' },
        { id: 'option2', title: 'Option 2' }
      ]
    );
    console.log('Interactive message result:', interactiveResult);
    
    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Send template messages
    console.log('\n📋 Test 3: Sending template messages...');
    
    const templates = [
      'default_hi_and_loan_prompt',
      'update_location_cron_util',
      'inactive_vendors_support_prompt_util',
      'inactive_vendors_reply_to_yes_support_call_util',
      'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util',
      'welcome_message_for_onboarding_util'
    ];
    
    for (const templateName of templates) {
      console.log(`\n📤 Testing template: ${templateName}`);
      const templateResult = await sendTemplateMessage(testPhoneNumber, templateName);
      console.log(`Template ${templateName} result:`, templateResult);
      
      // Wait between template messages
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n✅ All Meta integration tests completed!');
    
  } catch (error) {
    console.error('❌ Error during Meta integration test:', error);
  }
}

// Run the test
testMetaIntegration()
  .then(() => {
    console.log('🎉 Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });

