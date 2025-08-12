import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple webhook test
async function testWebhookSimple() {
  try {
    const webhookUrl = 'http://localhost:3000/api/webhook';
    
    console.log('🧪 Simple Webhook Test');
    console.log('======================');
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    
    // Test 1: Basic webhook with minimal data
    console.log('\n📤 Test 1: Basic webhook test...');
    const basicPayload = {
      From: 'whatsapp:+919265466535',
      To: 'whatsapp:+15557897194', // Use actual Twilio number
      Body: 'hi'
    };

    console.log('Sending payload:', basicPayload);

    const response = await axios.post(webhookUrl, basicPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', response.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

// Run the test
testWebhookSimple();
