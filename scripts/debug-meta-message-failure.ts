import 'dotenv/config';
import axios from 'axios';

// Meta WhatsApp API configuration
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const META_API_BASE_URL = `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}`;

async function debugMessageFailure() {
  console.log('🔍 Debugging Meta WhatsApp message failure...');
  console.log('📱 Phone Number ID:', META_PHONE_NUMBER_ID);
  console.log('🔑 Access Token length:', META_ACCESS_TOKEN?.length || 0);
  
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials');
    return;
  }

  const testPhoneNumber = '918130026321';
  const testMessage = 'Debug test message to identify failure reason';

  try {
    // Test 1: Check if the phone number is valid for WhatsApp
    console.log('\n📤 Test 1: Checking phone number validation...');
    try {
      const validationResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${testPhoneNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${META_ACCESS_TOKEN}`
          }
        }
      );
      console.log('✅ Phone number validation successful:', validationResponse.data);
    } catch (validationError) {
      console.log('❌ Phone number validation failed:', validationError.response?.data || validationError.message);
    }

    // Test 2: Send a simple text message and capture detailed error
    console.log('\n📤 Test 2: Sending message with detailed error capture...');
    const messageData = {
      messaging_product: 'whatsapp',
      to: testPhoneNumber,
      type: 'text',
      text: {
        body: testMessage
      }
    };

    console.log('📋 Request data:', JSON.stringify(messageData, null, 2));

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
      
      // Test 3: Check message status immediately
      console.log('\n📤 Test 3: Checking immediate message status...');
      try {
        // Wait a bit for status to be available
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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

    // Test 4: Check business account status
    console.log('\n📤 Test 4: Checking business account status...');
    try {
      const businessResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${META_ACCESS_TOKEN}`
          }
        }
      );
      console.log('📊 Business account status:', JSON.stringify(businessResponse.data, null, 2));
    } catch (businessError) {
      console.log('⚠️ Could not fetch business account status:', businessError.response?.data || businessError.message);
    }

    // Test 5: Check if we can send to a different format
    console.log('\n📤 Test 5: Testing different phone number formats...');
    const phoneFormats = [
      '918130026321',      // Current format
      '+918130026321',     // With + prefix
      '918130026321',      // Without + prefix
    ];

    for (const phoneFormat of phoneFormats) {
      try {
        const normalizedPhone = phoneFormat.replace(/^\+/, '');
        const testData = {
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: {
            body: `Test message with format: ${phoneFormat}`
          }
        };

        console.log(`📋 Testing format: ${phoneFormat} -> ${normalizedPhone}`);
        
        const formatResponse = await axios.post(
          `${META_API_BASE_URL}/messages`,
          testData,
          {
            headers: {
              'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`✅ Format ${phoneFormat} successful:`, formatResponse.data);
      } catch (formatError) {
        console.log(`❌ Format ${phoneFormat} failed:`, formatError.response?.data || formatError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error in debug test:', error.response?.data || error.message);
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

// Run the debug test
debugMessageFailure().catch(console.error);
