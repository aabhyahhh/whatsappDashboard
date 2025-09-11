import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test Aadhaar verification functionality
async function testAadhaarVerification() {
  try {
    const webhookUrl = process.env.WEBHOOK_URL || 'https://whatsappdashboard-1.onrender.com/api/webhook';
    
    console.log('🧪 Testing Aadhaar Verification Functionality');
    console.log('=============================================');
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    
    // Test 1: Send "yes i will verify aadhar" message
    console.log('\n📤 Test 1: Sending "yes i will verify aadhar" message...');
    const aadhaarPayload = {
      From: 'whatsapp:+918130026321', // Test vendor number
      To: 'whatsapp:+15557897194',    // Twilio number
      Body: 'yes i will verify aadhar',
      ButtonPayload: null
    };

    const response1 = await axios.post(webhookUrl, aadhaarPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ "yes i will verify aadhar" message response status:', response1.status);
    console.log('✅ "yes i will verify aadhar" message response data:', response1.data);
    
    // Wait 2 seconds
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Send "हाँ मैं आधार सत्यापित करूंगा" message (Hindi)
    console.log('\n📤 Test 2: Sending Hindi Aadhaar verification message...');
    const hindiAadhaarPayload = {
      From: 'whatsapp:+918130026321',
      To: 'whatsapp:+15557897194',
      Body: 'हाँ मैं आधार सत्यापित करूंगा',
      ButtonPayload: null
    };

    const response2 = await axios.post(webhookUrl, hindiAadhaarPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Hindi Aadhaar verification message response status:', response2.status);
    console.log('✅ Hindi Aadhaar verification message response data:', response2.data);
    
    // Wait 2 seconds
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Send "Yes, I will verify Aadhaar" message (with different casing)
    console.log('\n📤 Test 3: Sending "Yes, I will verify Aadhaar" message...');
    const formalAadhaarPayload = {
      From: 'whatsapp:+918130026321',
      To: 'whatsapp:+15557897194',
      Body: 'Yes, I will verify Aadhaar',
      ButtonPayload: null
    };

    const response3 = await axios.post(webhookUrl, formalAadhaarPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Formal Aadhaar verification message response status:', response3.status);
    console.log('✅ Formal Aadhaar verification message response data:', response3.data);
    
    // Test 4: Check if messages are being saved to database
    console.log('\n📊 Test 4: Checking database for saved messages...');
    try {
      const messagesResponse = await axios.get(`${process.env.API_BASE_URL || 'https://whatsappdashboard-1.onrender.com'}/api/messages`);
      console.log('✅ Messages in database:', messagesResponse.data.length);
      
      // Check for recent Aadhaar verification messages
      const recentMessages = messagesResponse.data.filter((msg: any) => 
        msg.from === 'whatsapp:+918130026321' && 
        new Date(msg.timestamp) > new Date(Date.now() - 60000) // Last minute
      );
      console.log('✅ Recent messages from test vendor:', recentMessages.length);
      
      recentMessages.forEach((msg: any, index: number) => {
        console.log(`   ${index + 1}. ${msg.direction}: "${msg.body}" (${new Date(msg.timestamp).toLocaleTimeString()})`);
      });
    } catch (dbError) {
      console.log('⚠️ Could not check database:', dbError.message);
    }
    
    console.log('\n✅ Aadhaar verification test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Check server logs for Aadhaar verification processing');
    console.log('   - Verify template message HX1a44edbb684afc1a8213054a4731e53d is sent');
    console.log('   - Check if vendor Aadhaar verification status is updated');
    console.log('   - Verify database message storage');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

// Run the test
testAadhaarVerification();
