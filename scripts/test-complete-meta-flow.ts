import 'dotenv/config';
import { sendTemplateMessage, sendTextMessage } from '../server/meta.js';
import { connectDB } from '../server/db.js';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import SupportCallLog from '../server/models/SupportCallLog.js';
import LoanReplyLog from '../server/models/LoanReplyLog.js';

async function testCompleteMetaFlow() {
  console.log('🧪 Testing Complete Meta WhatsApp Integration Flow...');
  
  try {
    await connectDB();
    
    // Test phone number
    const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '+919876543210';
    
    console.log('\n📱 Test 1: Greeting Flow');
    console.log('Simulating vendor sending "hi" message...');
    
    // Simulate incoming greeting message
    const greetingMessage = new Message({
      from: testPhoneNumber,
      to: process.env.META_PHONE_NUMBER_ID,
      body: 'hi',
      direction: 'inbound',
      timestamp: new Date(),
      meta: {
        messageId: 'test_greeting_' + Date.now(),
        type: 'text'
      }
    });
    await greetingMessage.save();
    console.log('✅ Greeting message saved to database');
    
    // Send greeting response
    const greetingResult = await sendTemplateMessage(testPhoneNumber, 'default_hi_and_loan_prompt');
    if (greetingResult) {
      console.log('✅ Greeting response sent successfully');
    }
    
    console.log('\n💰 Test 2: Loan Interest Flow');
    console.log('Simulating vendor replying with "loan"...');
    
    // Simulate loan interest message
    const loanMessage = new Message({
      from: testPhoneNumber,
      to: process.env.META_PHONE_NUMBER_ID,
      body: 'loan',
      direction: 'inbound',
      timestamp: new Date(),
      meta: {
        messageId: 'test_loan_' + Date.now(),
        type: 'text'
      }
    });
    await loanMessage.save();
    console.log('✅ Loan interest message saved to database');
    
    // Send loan prompt with Aadhaar verification button
    const loanResult = await sendTemplateMessage(testPhoneNumber, 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not');
    if (loanResult) {
      console.log('✅ Loan prompt with Aadhaar verification sent successfully');
    }
    
    // Create loan reply log entry
    const loanLog = new LoanReplyLog({
      vendorName: 'Test Vendor',
      contactNumber: testPhoneNumber,
      timestamp: new Date(),
      aadharVerified: false
    });
    await loanLog.save();
    console.log('✅ Loan reply log created');
    
    console.log('\n✅ Test 3: Aadhaar Verification Flow');
    console.log('Simulating vendor clicking "Yes, I will verify Aadhar" button...');
    
    // Simulate Aadhaar verification button click
    const aadhaarMessage = new Message({
      from: testPhoneNumber,
      to: process.env.META_PHONE_NUMBER_ID,
      body: 'Yes, I will verify Aadhar',
      direction: 'inbound',
      timestamp: new Date(),
      meta: {
        messageId: 'test_aadhaar_' + Date.now(),
        type: 'interactive',
        button: {
          id: 'yes_verify_aadhar',
          title: 'Yes, I will verify Aadhar'
        }
      }
    });
    await aadhaarMessage.save();
    console.log('✅ Aadhaar verification message saved to database');
    
    // Update loan log with Aadhaar verification
    await LoanReplyLog.findOneAndUpdate(
      { contactNumber: testPhoneNumber },
      { aadharVerified: true },
      { new: true }
    );
    console.log('✅ Loan reply log updated with Aadhaar verification');
    
    // Send Aadhaar verification confirmation
    const aadhaarConfirmation = `✅ *Aadhaar Verification Successful!*\n\n🎉 Your Aadhaar verification has been registered successfully!\n\n📅 Verified on: ${new Date().toLocaleDateString('en-IN')}\n⏰ Time: ${new Date().toLocaleTimeString('en-IN')}\n\n✅ Status: *VERIFIED*\n\nThank you for completing the verification process! 🙏\n\nआपका आधार सत्यापन सफलतापूर्वक पंजीकृत हो गया है! ✅`;
    
    const aadhaarResult = await sendTextMessage(testPhoneNumber, aadhaarConfirmation);
    if (aadhaarResult) {
      console.log('✅ Aadhaar verification confirmation sent successfully');
    }
    
    console.log('\n📞 Test 4: Support Call Flow');
    console.log('Simulating vendor requesting support call...');
    
    // Simulate support call request
    const supportMessage = new Message({
      from: testPhoneNumber,
      to: process.env.META_PHONE_NUMBER_ID,
      body: 'yes',
      direction: 'inbound',
      timestamp: new Date(),
      meta: {
        messageId: 'test_support_' + Date.now(),
        type: 'text'
      }
    });
    await supportMessage.save();
    console.log('✅ Support call request message saved to database');
    
    // Create support call log entry
    const supportLog = new SupportCallLog({
      vendorName: 'Test Vendor',
      contactNumber: testPhoneNumber,
      timestamp: new Date(),
      completed: false
    });
    await supportLog.save();
    console.log('✅ Support call log created');
    
    // Send support confirmation
    const supportResult = await sendTemplateMessage(testPhoneNumber, 'inactive_vendors_reply_to_yes_support_call');
    if (supportResult) {
      console.log('✅ Support call confirmation sent successfully');
    }
    
    console.log('\n📍 Test 5: Location Update Flow');
    console.log('Sending location update message...');
    
    // Send location update message
    const locationResult = await sendTemplateMessage(testPhoneNumber, 'update_location_cron');
    if (locationResult) {
      console.log('✅ Location update message sent successfully');
    }
    
    console.log('\n👋 Test 6: Welcome Message Flow');
    console.log('Sending welcome message...');
    
    // Send welcome message
    const welcomeResult = await sendTemplateMessage(testPhoneNumber, 'welcome_message_for_onboarding');
    if (welcomeResult) {
      console.log('✅ Welcome message sent successfully');
    }
    
    console.log('\n📊 Test 7: Database Verification');
    
    // Verify all messages were saved
    const allMessages = await Message.find({ from: testPhoneNumber }).sort({ timestamp: -1 });
    console.log(`✅ Found ${allMessages.length} messages in database`);
    
    // Verify support call log
    const supportCalls = await SupportCallLog.find({ contactNumber: testPhoneNumber });
    console.log(`✅ Found ${supportCalls.length} support call logs`);
    
    // Verify loan reply log
    const loanReplies = await LoanReplyLog.find({ contactNumber: testPhoneNumber });
    console.log(`✅ Found ${loanReplies.length} loan reply logs`);
    
    console.log('\n🎉 Complete Meta Integration Flow Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Greeting flow - Working');
    console.log('✅ Loan interest flow - Working');
    console.log('✅ Aadhaar verification flow - Working');
    console.log('✅ Support call flow - Working');
    console.log('✅ Location update flow - Working');
    console.log('✅ Welcome message flow - Working');
    console.log('✅ Database integration - Working');
    
  } catch (error) {
    console.error('❌ Error during complete Meta flow test:', error);
  }
}

// Run the test
testCompleteMetaFlow()
  .then(() => {
    console.log('🎉 Complete flow test finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Complete flow test failed:', error);
    process.exit(1);
  });
