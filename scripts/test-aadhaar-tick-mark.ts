import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test Aadhaar verification tick mark functionality
async function testAadhaarTickMark() {
  try {
    const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook';
    
    console.log('🧪 Testing Aadhaar Verification Tick Mark');
    console.log('=========================================');
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    
    // Test 1: Send button payload for Aadhaar verification
    console.log('\n📤 Test 1: Sending Aadhaar verification button click...');
    const buttonPayload = {
      From: 'whatsapp:+918130026321', // Test vendor number
      To: 'whatsapp:+15557897194',    // Twilio number
      Body: '',
      ButtonPayload: 'Yes, I will verify Aadhar'
    };

    const response1 = await axios.post(webhookUrl, buttonPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Button click response status:', response1.status);
    console.log('✅ Button click response data:', response1.data);
    
    // Wait 3 seconds
    console.log('\n⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Send text message for Aadhaar verification
    console.log('\n📤 Test 2: Sending text Aadhaar verification message...');
    const textPayload = {
      From: 'whatsapp:+918130026321',
      To: 'whatsapp:+15557897194',
      Body: 'yes i will verify aadhar',
      ButtonPayload: null
    };

    const response2 = await axios.post(webhookUrl, textPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Text message response status:', response2.status);
    console.log('✅ Text message response data:', response2.data);
    
    // Wait 3 seconds
    console.log('\n⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 3: Check database for verification status
    console.log('\n📊 Test 3: Checking database for verification status...');
    try {
      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      
      // Check messages for visual confirmation
      const messagesResponse = await axios.get(`${apiBaseUrl}/api/messages`);
      const recentMessages = messagesResponse.data.filter((msg: any) => 
        msg.from === 'whatsapp:+918130026321' && 
        new Date(msg.timestamp) > new Date(Date.now() - 60000) // Last minute
      );
      
      console.log('✅ Recent messages from test vendor:', recentMessages.length);
      
      // Look for visual confirmation messages
      const visualConfirmations = recentMessages.filter((msg: any) => 
        msg.body && msg.body.includes('✅ Aadhaar Verification Successful')
      );
      
      console.log('✅ Visual confirmation messages found:', visualConfirmations.length);
      
      visualConfirmations.forEach((msg: any, index: number) => {
        console.log(`   ${index + 1}. ${msg.direction}: "${msg.body.substring(0, 100)}..." (${new Date(msg.timestamp).toLocaleTimeString()})`);
      });
      
      // Check for verification status in user data
      const usersResponse = await axios.get(`${apiBaseUrl}/api/users`);
      const testUser = usersResponse.data.find((user: any) => 
        user.contactNumber === '+918130026321' || 
        user.contactNumber === '918130026321' ||
        user.contactNumber === '8130026321'
      );
      
      if (testUser) {
        console.log('✅ Test user found in database');
        console.log('✅ Aadhaar verification status:', testUser.aadharVerified);
        console.log('✅ Aadhaar verification date:', testUser.aadharVerificationDate);
      } else {
        console.log('⚠️ Test user not found in database');
      }
      
    } catch (dbError) {
      console.log('⚠️ Could not check database:', dbError.message);
    }
    
    console.log('\n✅ Aadhaar verification tick mark test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Check server logs for Aadhaar verification processing');
    console.log('   - Verify visual confirmation message with tick mark is sent');
    console.log('   - Check if vendor Aadhaar verification status is updated');
    console.log('   - Verify both button click and text message triggers work');
    console.log('   - Look for ✅ emoji and "VERIFIED" status in messages');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

// Run the test
testAadhaarTickMark();
