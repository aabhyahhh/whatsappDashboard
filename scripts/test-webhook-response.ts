import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test webhook response functionality
async function testWebhookResponse() {
  try {
    const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook';
    
    console.log('🧪 Testing Webhook Response Functionality');
    console.log('==========================================');
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    console.log(`🔑 Twilio Account SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Present' : 'Missing'}`);
    console.log(`🔑 Twilio Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing'}`);
    console.log(`📱 Twilio Phone Number: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
    console.log(`🔧 Messaging Service SID: ${process.env.TWILIO_MESSAGING_SERVICE_SID || 'Not set'}`);
    
    // Test 1: Send "hi" message
    console.log('\n📤 Test 1: Sending "hi" message...');
    const hiPayload = {
      From: 'whatsapp:+919265466535', // Test user number
      To: 'whatsapp:+1234567890',     // Twilio number (replace with actual)
      Body: 'hi',
      ButtonPayload: null
    };

    const response1 = await axios.post(webhookUrl, hiPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ "hi" message response status:', response1.status);
    console.log('✅ "hi" message response data:', response1.data);
    
    // Wait 2 seconds
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Send "hello" message
    console.log('\n📤 Test 2: Sending "hello" message...');
    const helloPayload = {
      From: 'whatsapp:+919265466535',
      To: 'whatsapp:+1234567890',
      Body: 'hello',
      ButtonPayload: null
    };

    const response2 = await axios.post(webhookUrl, helloPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ "hello" message response status:', response2.status);
    console.log('✅ "hello" message response data:', response2.data);
    
    // Wait 2 seconds
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Send "loan" message
    console.log('\n📤 Test 3: Sending "loan" message...');
    const loanPayload = {
      From: 'whatsapp:+919265466535',
      To: 'whatsapp:+1234567890',
      Body: 'loan',
      ButtonPayload: null
    };

    const response3 = await axios.post(webhookUrl, loanPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ "loan" message response status:', response3.status);
    console.log('✅ "loan" message response data:', response3.data);
    
    // Test 4: Check if messages are being saved to database
    console.log('\n📊 Test 4: Checking database for saved messages...');
    try {
      const messagesResponse = await axios.get(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/messages`);
      console.log('✅ Messages in database:', messagesResponse.data.length);
      
      // Check for recent messages
      const recentMessages = messagesResponse.data.filter((msg: any) => 
        msg.from === 'whatsapp:+919265466535' && 
        new Date(msg.timestamp) > new Date(Date.now() - 60000) // Last minute
      );
      console.log('✅ Recent messages from test user:', recentMessages.length);
      
      recentMessages.forEach((msg: any, index: number) => {
        console.log(`   ${index + 1}. ${msg.direction}: "${msg.body}" (${new Date(msg.timestamp).toLocaleTimeString()})`);
      });
    } catch (dbError) {
      console.log('⚠️ Could not check database:', dbError.message);
    }
    
    console.log('\n✅ Webhook response test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Check server logs for detailed webhook processing');
    console.log('   - Verify Twilio client initialization');
    console.log('   - Check if template messages are being sent');
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
testWebhookResponse();
