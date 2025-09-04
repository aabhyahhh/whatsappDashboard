#!/usr/bin/env tsx

/**
 * Test script to verify webhook signature verification
 */

import crypto from 'crypto';
import axios from 'axios';
import 'dotenv/config';

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://whatsappdashboard-1.onrender.com'
  : 'http://localhost:5000';

const META_APP_SECRET = process.env.META_APP_SECRET;

function createSignature(payload: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

async function testWebhookSignature() {
  console.log('🔍 Testing Webhook Signature Verification...\n');
  
  if (!META_APP_SECRET) {
    console.log('❌ META_APP_SECRET not available in local environment');
    console.log('📝 This test requires the app secret to generate valid signatures');
    return;
  }
  
  // Test payload (simplified Meta webhook payload)
  const testPayload = {
    object: "whatsapp_business_account",
    entry: [{
      id: "123456789",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: {
            display_phone_number: "1234567890",
            phone_number_id: "123456789012345"
          },
          messages: [{
            from: "1234567890",
            id: "test_message_id",
            timestamp: "1234567890",
            text: {
              body: "Hello, this is a test message"
            },
            type: "text"
          }]
        },
        field: "messages"
      }]
    }]
  };
  
  const payloadString = JSON.stringify(testPayload);
  const signature = createSignature(payloadString, META_APP_SECRET);
  
  console.log('📝 Test payload:', payloadString);
  console.log('📝 Generated signature:', signature);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/webhook`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      }
    });
    
    console.log('✅ Webhook signature verification test passed');
    console.log(`📝 Status: ${response.status}`);
    console.log(`📝 Response: ${response.data}`);
    
  } catch (error: any) {
    console.error('❌ Webhook signature verification test failed:', error.message);
    if (error.response) {
      console.error(`📝 Status: ${error.response.status}`);
      console.error(`📝 Response: ${error.response.data}`);
    }
  }
}

async function testInvalidSignature() {
  console.log('\n🔍 Testing Invalid Signature (should fail)...\n');
  
  const testPayload = { test: "invalid signature test" };
  const invalidSignature = "sha256=invalid_signature_here";
  
  try {
    const response = await axios.post(`${BASE_URL}/api/webhook`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': invalidSignature
      }
    });
    
    console.log('❌ Invalid signature test should have failed but passed');
    console.log(`📝 Status: ${response.status}`);
    
  } catch (error: any) {
    if (error.response?.status === 403) {
      console.log('✅ Invalid signature correctly rejected (403 Forbidden)');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 Starting Webhook Signature Test...\n');
  console.log(`🌐 Testing against: ${BASE_URL}\n`);
  
  await testWebhookSignature();
  await testInvalidSignature();
  
  console.log('\n✨ Test completed!');
}

main().catch(console.error);
