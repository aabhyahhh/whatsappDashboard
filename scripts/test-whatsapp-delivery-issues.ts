import 'dotenv/config';
import axios from 'axios';

// Meta WhatsApp API configuration
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const META_API_BASE_URL = `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}`;

async function testWhatsAppDeliveryIssues() {
  console.log('🔍 Testing WhatsApp delivery issues...');
  console.log('📱 Phone Number ID:', META_PHONE_NUMBER_ID);
  console.log('🔑 Access Token length:', META_ACCESS_TOKEN?.length || 0);
  
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials');
    return;
  }

  const testPhoneNumber = '918130026321';

  try {
    // Test 1: Check business account details
    console.log('\n📤 Test 1: Checking business account details...');
    try {
      const businessResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${META_ACCESS_TOKEN}`
          }
        }
      );
      console.log('📊 Business account details:', JSON.stringify(businessResponse.data, null, 2));
      
      // Check important fields
      const business = businessResponse.data;
      console.log('\n🔍 Business account analysis:');
      console.log(`- Verified Name: ${business.verified_name}`);
      console.log(`- Code Verification Status: ${business.code_verification_status}`);
      console.log(`- Quality Rating: ${business.quality_rating}`);
      console.log(`- Platform Type: ${business.platform_type}`);
      console.log(`- Throughput Level: ${business.throughput?.level}`);
      console.log(`- Display Phone: ${business.display_phone_number}`);
      
      if (business.quality_rating !== 'GREEN') {
        console.log('⚠️ WARNING: Quality rating is not GREEN - this may affect message delivery');
      }
      
      if (business.throughput?.level !== 'STANDARD') {
        console.log('⚠️ WARNING: Throughput level is not STANDARD - this may limit message sending');
      }
      
    } catch (businessError) {
      console.log('❌ Could not fetch business account details:', businessError.response?.data || businessError.message);
    }

    // Test 2: Check if we can send a template message (which has different rules)
    console.log('\n📤 Test 2: Testing template message delivery...');
    try {
      const templateData = {
        messaging_product: 'whatsapp',
        to: testPhoneNumber,
        type: 'template',
        template: {
          name: 'hello_world',
          language: {
            code: 'en_US'
          }
        }
      };

      console.log('📋 Template request data:', JSON.stringify(templateData, null, 2));

      const templateResponse = await axios.post(
        `${META_API_BASE_URL}/messages`,
        templateData,
        {
          headers: {
            'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Template message response:', JSON.stringify(templateResponse.data, null, 2));
      
      if (templateResponse.data && templateResponse.data.messages && templateResponse.data.messages.length > 0) {
        const templateMessageId = templateResponse.data.messages[0].id;
        console.log('📱 Template Message ID:', templateMessageId);
        
        // Wait and check template message status
        console.log('⏳ Waiting 5 seconds for template message status...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Note: We can't directly check message status via API, but we can monitor webhooks
        console.log('📊 Template message sent - check webhook for delivery status');
      }
      
    } catch (templateError) {
      console.log('❌ Template message failed:', templateError.response?.data || templateError.message);
    }

    // Test 3: Check message templates available
    console.log('\n📤 Test 3: Checking available message templates...');
    try {
      const templatesResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${META_ACCESS_TOKEN}`
          }
        }
      );
      console.log('📊 Available templates:', JSON.stringify(templatesResponse.data, null, 2));
    } catch (templatesError) {
      console.log('❌ Could not fetch templates:', templatesError.response?.data || templatesError.message);
    }

    // Test 4: Send a simple text message and monitor
    console.log('\n📤 Test 4: Sending text message for monitoring...');
    try {
      const textData = {
        messaging_product: 'whatsapp',
        to: testPhoneNumber,
        type: 'text',
        text: {
          body: 'Test message for delivery monitoring - please check webhook status'
        }
      };

      const textResponse = await axios.post(
        `${META_API_BASE_URL}/messages`,
        textData,
        {
          headers: {
            'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Text message response:', JSON.stringify(textResponse.data, null, 2));
      
      if (textResponse.data && textResponse.data.messages && textResponse.data.messages.length > 0) {
        const textMessageId = textResponse.data.messages[0].id;
        console.log('📱 Text Message ID:', textMessageId);
        console.log('📊 Text message sent - check webhook for delivery status');
        console.log('🔍 Monitor the server logs for webhook status updates');
      }
      
    } catch (textError) {
      console.log('❌ Text message failed:', textError.response?.data || textError.message);
    }

    // Test 5: Check webhook configuration
    console.log('\n📤 Test 5: Checking webhook configuration...');
    try {
      const webhookResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}/webhooks`,
        {
          headers: {
            'Authorization': `Bearer ${META_ACCESS_TOKEN}`
          }
        }
      );
      console.log('📊 Webhook configuration:', JSON.stringify(webhookResponse.data, null, 2));
    } catch (webhookError) {
      console.log('❌ Could not fetch webhook config:', webhookError.response?.data || webhookError.message);
    }

    console.log('\n📋 Summary of potential delivery issues:');
    console.log('1. Phone number not registered on WhatsApp');
    console.log('2. Recipient has blocked the business number');
    console.log('3. 24-hour window restrictions (free-form messages)');
    console.log('4. Business account quality rating issues');
    console.log('5. Rate limiting or throughput restrictions');
    console.log('6. Webhook not properly configured for status updates');
    console.log('\n🔍 Check the server logs for detailed webhook status updates');

  } catch (error) {
    console.error('❌ Error in delivery test:', error.response?.data || error.message);
  }
}

// Run the test
testWhatsAppDeliveryIssues().catch(console.error);
