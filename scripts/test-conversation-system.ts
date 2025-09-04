#!/usr/bin/env tsx

/**
 * Test script for the conversation management system
 * Tests the complete flow from Meta webhook to conversation engine
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

// Configuration
const CONVERSATION_ROUTER_URL = process.env.CONVERSATION_ROUTER_URL || 'http://localhost:5001/api/webhook';
const CONVERSATION_ENGINE_URL = process.env.CONVERSATION_ENGINE_URL || 'http://localhost:5001/api/conversation';
const META_APP_SECRET = process.env.META_APP_SECRET || 'test-app-secret';
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'test-verify-token';
const RELAY_SECRET = process.env.RELAY_SECRET || 'test-relay-secret';

// Test data
const testPhoneNumber = '+919876543210';
const testMessageId = `test_msg_${Date.now()}`;

/**
 * Create a test webhook payload
 */
function createTestWebhookPayload(messageType: 'text' | 'button' | 'location' = 'text', text?: string) {
  const basePayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: '123456789012345'
              },
              contacts: [
                {
                  profile: {
                    name: 'Test Vendor'
                  },
                  wa_id: testPhoneNumber
                }
              ],
              messages: [],
              statuses: []
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  // Add message based on type
  if (messageType === 'text') {
    basePayload.entry[0].changes[0].value.messages = [
      {
        id: testMessageId,
        from: testPhoneNumber,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        text: {
          body: text || 'hi'
        },
        type: 'text'
      }
    ];
  } else if (messageType === 'button') {
    basePayload.entry[0].changes[0].value.messages = [
      {
        id: testMessageId,
        from: testPhoneNumber,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'yes_verify_aadhar',
            title: 'Yes, I will verify Aadhar'
          }
        },
        type: 'interactive'
      }
    ];
  } else if (messageType === 'location') {
    basePayload.entry[0].changes[0].value.messages = [
      {
        id: testMessageId,
        from: testPhoneNumber,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        location: {
          latitude: 23.0210,
          longitude: 72.5714,
          name: 'Test Location',
          address: 'Test Address'
        },
        type: 'location'
      }
    ];
  }

  return basePayload;
}

/**
 * Create Meta signature for webhook payload
 */
function createMetaSignature(payload: string): string {
  return 'sha256=' + crypto.createHmac('sha256', META_APP_SECRET)
    .update(payload)
    .digest('hex');
}

/**
 * Create relay signature for forwarded payload
 */
function createRelaySignature(payload: string): string {
  return 'sha256=' + crypto.createHmac('sha256', RELAY_SECRET)
    .update(payload)
    .digest('hex');
}

/**
 * Test webhook verification
 */
async function testWebhookVerification() {
  console.log('🔍 Testing webhook verification...');
  
  try {
    const challenge = 'test-challenge-123';
    const response = await fetch(
      `${CONVERSATION_ROUTER_URL}?hub.mode=subscribe&hub.verify_token=${META_VERIFY_TOKEN}&hub.challenge=${challenge}`
    );
    
    if (response.ok) {
      const responseText = await response.text();
      if (responseText === challenge) {
        console.log('✅ Webhook verification successful');
        return true;
      } else {
        console.log('❌ Webhook verification failed: challenge mismatch');
        return false;
      }
    } else {
      console.log(`❌ Webhook verification failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    return false;
  }
}

/**
 * Test conversation router with different message types
 */
async function testConversationRouter(messageType: 'text' | 'button' | 'location' = 'text', text?: string) {
  console.log(`📨 Testing conversation router with ${messageType} message...`);
  
  try {
    const payload = createTestWebhookPayload(messageType, text);
    const payloadString = JSON.stringify(payload);
    const signature = createMetaSignature(payloadString);
    
    const response = await fetch(CONVERSATION_ROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      },
      body: payloadString
    });
    
    if (response.ok) {
      console.log('✅ Conversation router processed message successfully');
      return true;
    } else {
      console.log(`❌ Conversation router failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Conversation router error:', error);
    return false;
  }
}

/**
 * Test conversation engine directly
 */
async function testConversationEngine(messageType: 'text' | 'button' | 'location' = 'text', text?: string) {
  console.log(`🤖 Testing conversation engine with ${messageType} message...`);
  
  try {
    const payload = createTestWebhookPayload(messageType, text);
    const payloadString = JSON.stringify(payload);
    const signature = createRelaySignature(payloadString);
    
    const response = await fetch(CONVERSATION_ENGINE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Signature': signature,
        'X-Forwarded-From': 'test-script'
      },
      body: payloadString
    });
    
    if (response.ok) {
      console.log('✅ Conversation engine processed message successfully');
      return true;
    } else {
      console.log(`❌ Conversation engine failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Conversation engine error:', error);
    return false;
  }
}

/**
 * Test idempotency (duplicate message handling)
 */
async function testIdempotency() {
  console.log('🔄 Testing idempotency (duplicate message handling)...');
  
  try {
    const payload = createTestWebhookPayload('text', 'test duplicate message');
    const payloadString = JSON.stringify(payload);
    const signature = createRelaySignature(payloadString);
    
    // Send the same message twice
    const response1 = await fetch(CONVERSATION_ENGINE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Signature': signature,
        'X-Forwarded-From': 'test-script'
      },
      body: payloadString
    });
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response2 = await fetch(CONVERSATION_ENGINE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Signature': signature,
        'X-Forwarded-From': 'test-script'
      },
      body: payloadString
    });
    
    if (response1.ok && response2.ok) {
      console.log('✅ Idempotency test completed (both requests accepted)');
      return true;
    } else {
      console.log(`❌ Idempotency test failed: ${response1.status}, ${response2.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Idempotency test error:', error);
    return false;
  }
}

/**
 * Test different conversation flows
 */
async function testConversationFlows() {
  console.log('💬 Testing different conversation flows...');
  
  const flows = [
    { type: 'text' as const, text: 'hi', description: 'Greeting flow' },
    { type: 'text' as const, text: 'loan', description: 'Loan inquiry flow' },
    { type: 'text' as const, text: 'yes i will verify aadhaar', description: 'Aadhaar verification flow' },
    { type: 'text' as const, text: 'yes', description: 'Support request flow' },
    { type: 'button' as const, description: 'Button response flow' },
    { type: 'location' as const, description: 'Location sharing flow' }
  ];
  
  let successCount = 0;
  
  for (const flow of flows) {
    console.log(`  Testing ${flow.description}...`);
    const success = await testConversationEngine(flow.type, flow.text);
    if (success) {
      successCount++;
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`✅ Conversation flows test completed: ${successCount}/${flows.length} successful`);
  return successCount === flows.length;
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting conversation management system tests...\n');
  
  const tests = [
    { name: 'Webhook Verification', fn: testWebhookVerification },
    { name: 'Text Message Router', fn: () => testConversationRouter('text', 'hi') },
    { name: 'Button Message Router', fn: () => testConversationRouter('button') },
    { name: 'Location Message Router', fn: () => testConversationRouter('location') },
    { name: 'Text Message Engine', fn: () => testConversationEngine('text', 'hi') },
    { name: 'Button Message Engine', fn: () => testConversationEngine('button') },
    { name: 'Location Message Engine', fn: () => testConversationEngine('location') },
    { name: 'Idempotency Test', fn: testIdempotency },
    { name: 'Conversation Flows', fn: testConversationFlows }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
        console.log(`✅ ${test.name} passed`);
      } else {
        console.log(`❌ ${test.name} failed`);
      }
    } catch (error) {
      console.error(`❌ ${test.name} error:`, error);
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    console.log('🎉 All tests passed! Conversation management system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the logs above for details.');
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, testWebhookVerification, testConversationRouter, testConversationEngine, testIdempotency, testConversationFlows };
