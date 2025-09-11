import 'dotenv/config';
import axios from 'axios';
import crypto from 'crypto';

// Test the Aadhaar verification button fix
async function testAadhaarButtonFix() {
  try {
    console.log('🧪 Testing Aadhaar Verification Button Fix');
    console.log('==========================================');
    
    const webhookUrl = process.env.WEBHOOK_URL || 'https://whatsappdashboard-1.onrender.com/api/webhook';
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    
    // Test payload simulating a button click response
    const buttonPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123456789',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15557897194',
                  phone_number_id: '611004152086553'
                },
                messages: [
                  {
                    id: 'wamid.test_button_response_' + Date.now(),
                    from: '918130026321',
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    button: {
                      id: 'yes_verify_aadhar',
                      title: "Yes, I'll very Aadhar"
                    },
                    type: 'button'
                  }
                ]
              },
              field: 'messages'
            }
          ]
        }
      ]
    };
    
    console.log('\n📤 Sending button response payload...');
    console.log('🔍 Button details:', buttonPayload.entry[0].changes[0].value.messages[0].button);
    
    const response = await axios.post(webhookUrl, buttonPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=' + crypto
          .createHmac('sha256', process.env.META_APP_SECRET || 'test_secret')
          .update(JSON.stringify(buttonPayload))
          .digest('hex')
      }
    });
    
    console.log('✅ Button response test status:', response.status);
    console.log('✅ Button response test data:', response.data);
    
    if (response.status === 200) {
      console.log('\n🎉 Test completed successfully!');
      console.log('📋 Expected behavior:');
      console.log('   - Template "reply_to_yes_to_aadhar_verification_util" should be sent');
      console.log('   - Vendor Aadhaar verification status should be updated');
      console.log('   - LoanReplyLog should be updated with verification status');
      console.log('   - Confirmation message should be saved to database');
    } else {
      console.log('❌ Test failed with status:', response.status);
    }
    
  } catch (error: any) {
    console.error('❌ Error testing Aadhaar button fix:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.error('Full error:', error);
  }
}

// Run the test
testAadhaarButtonFix();
