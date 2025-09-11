// Test script for webhook router functionality
import fetch from 'node-fetch';
import crypto from 'crypto';

const WEBHOOK_URL = 'https://whatsappdashboard-1.onrender.com/api/webhook';
const RELAY_SECRET = process.env.RELAY_SECRET || 'test-secret';
const META_APP_SECRET = process.env.META_APP_SECRET || 'test-app-secret';
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'test-verify-token';

// Test webhook verification (GET)
async function testWebhookVerification() {
  console.log('🔍 Testing webhook verification...');
  
  try {
    const response = await fetch(`${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${META_VERIFY_TOKEN}&hub.challenge=test-challenge`);
    
    if (response.ok) {
      const challenge = await response.text();
      console.log('✅ Webhook verification successful:', challenge);
      return true;
    } else {
      console.log('❌ Webhook verification failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing webhook verification:', error);
    return false;
  }
}

// Test webhook signature verification and forwarding (POST)
async function testWebhookPost() {
  console.log('📨 Testing webhook POST with signature...');
  
  const testPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '123456789',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: '123456789'
          },
          messages: [{
            id: 'wamid.test123456789',
            from: '15551234567',
            timestamp: '1234567890',
            type: 'text',
            text: {
              body: 'Hello, this is a test message'
            }
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  const payloadString = JSON.stringify(testPayload);
  const signature = 'sha256=' + crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(payloadString)
    .digest('hex');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      },
      body: payloadString
    });
    
    if (response.ok) {
      const result = await response.text();
      console.log('✅ Webhook POST successful:', result);
      return true;
    } else {
      console.log('❌ Webhook POST failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing webhook POST:', error);
    return false;
  }
}

// Test duplicate message handling
async function testDuplicateHandling() {
  console.log('🔄 Testing duplicate message handling...');
  
  const testPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '123456789',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: '123456789'
          },
          messages: [{
            id: 'wamid.duplicate123456789',
            from: '15551234567',
            timestamp: '1234567890',
            type: 'text',
            text: {
              body: 'This is a duplicate test message'
            }
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  const payloadString = JSON.stringify(testPayload);
  const signature = 'sha256=' + crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(payloadString)
    .digest('hex');
  
  try {
    // Send first message
    const response1 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      },
      body: payloadString
    });
    
    console.log('First message response:', response1.status);
    
    // Send duplicate message
    const response2 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      },
      body: payloadString
    });
    
    console.log('Duplicate message response:', response2.status);
    
    if (response1.ok && response2.ok) {
      console.log('✅ Duplicate handling test completed');
      return true;
    } else {
      console.log('❌ Duplicate handling test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing duplicate handling:', error);
    return false;
  }
}

// Test invalid signature
async function testInvalidSignature() {
  console.log('🔒 Testing invalid signature rejection...');
  
  const testPayload = {
    object: 'whatsapp_business_account',
    entry: []
  };
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=invalid-signature'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (response.status === 403) {
      console.log('✅ Invalid signature correctly rejected');
      return true;
    } else {
      console.log('❌ Invalid signature not rejected:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing invalid signature:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting webhook router tests...\n');
  
  const results = await Promise.all([
    testWebhookVerification(),
    testWebhookPost(),
    testDuplicateHandling(),
    testInvalidSignature()
  ]);
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('❌ Some tests failed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };
