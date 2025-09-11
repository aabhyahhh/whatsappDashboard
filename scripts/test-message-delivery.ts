import 'dotenv/config';
import axios from 'axios';

// Meta WhatsApp API configuration
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const META_API_BASE_URL = `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}`;

async function testMessageDelivery() {
  console.log('🔍 Testing Meta WhatsApp API message delivery...');
  console.log('📱 Phone Number ID:', META_PHONE_NUMBER_ID);
  console.log('🔑 Access Token length:', META_ACCESS_TOKEN?.length || 0);
  
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials');
    return;
  }

  const testPhoneNumber = '918130026321';
  const testMessage = 'Test message delivery verification';

  try {
    // Test 1: Send a simple text message
    console.log('\n📤 Test 1: Sending simple text message...');
    const messageData = {
      messaging_product: 'whatsapp',
      to: testPhoneNumber,
      type: 'text',
      text: {
        body: testMessage
      }
    };

    console.log('📋 Request data:', JSON.stringify(messageData, null, 2));
    console.log('🌐 API URL:', `${META_API_BASE_URL}/messages`);

    const response = await axios.post(
      `${META_API_BASE_URL}/messages`,
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Response received:');
    console.log('📊 Status:', response.status);
    console.log('📄 Response data:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.messages && response.data.messages.length > 0) {
      const messageId = response.data.messages[0].id;
      console.log('📱 Message ID:', messageId);
      
      // Test 2: Check message status
      console.log('\n📤 Test 2: Checking message status...');
      try {
        const statusResponse = await axios.get(
          `${META_API_BASE_URL}/messages/${messageId}`,
          {
            headers: {
              'Authorization': `Bearer ${META_ACCESS_TOKEN}`
            }
          }
        );
        console.log('📊 Message status:', JSON.stringify(statusResponse.data, null, 2));
      } catch (statusError) {
        console.log('⚠️ Could not fetch message status:', statusError.response?.data || statusError.message);
      }
    }

    // Test 3: Check if phone number is valid
    console.log('\n📤 Test 3: Validating phone number...');
    try {
      const validationResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${testPhoneNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${META_ACCESS_TOKEN}`
          }
        }
      );
      console.log('📊 Phone validation:', JSON.stringify(validationResponse.data, null, 2));
    } catch (validationError) {
      console.log('⚠️ Phone validation failed:', validationError.response?.data || validationError.message);
    }

  } catch (error) {
    console.error('❌ Error testing message delivery:', error.response?.data || error.message);
    console.error('🔍 Full error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
  }
}

// Run the test
testMessageDelivery().catch(console.error);
