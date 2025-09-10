#!/usr/bin/env tsx

/**
 * Test Meta WhatsApp webhook functionality
 * This script tests if the webhook endpoints are working correctly
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '098765';

async function testWebhookVerification() {
  console.log('🧪 Testing Meta webhook verification...');
  
  try {
    const url = `${BASE_URL}/api/webhook?hub.mode=subscribe&hub.verify_token=${META_VERIFY_TOKEN}&hub.challenge=test123`;
    console.log('📡 Testing URL:', url);
    
    const response = await fetch(url);
    const responseText = await response.text();
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response text:', responseText);
    
    if (response.status === 200 && responseText === 'test123') {
      console.log('✅ Webhook verification test PASSED');
      return true;
    } else {
      console.log('❌ Webhook verification test FAILED');
      return false;
    }
  } catch (error) {
    console.error('❌ Webhook verification test ERROR:', error);
    return false;
  }
}

async function testConversationEngine() {
  console.log('🧪 Testing conversation engine endpoint...');
  
  try {
    const testPayload = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              id: 'test-message-id',
              from: '+919876543210',
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: 'text',
              text: { body: 'hi' }
            }]
          }
        }]
      }]
    };
    
    const url = `${BASE_URL}/api/conversation`;
    console.log('📡 Testing URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Signature': 'sha256=test-signature'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('📊 Response status:', response.status);
    const responseText = await response.text();
    console.log('📊 Response text:', responseText);
    
    if (response.status === 200) {
      console.log('✅ Conversation engine test PASSED');
      return true;
    } else {
      console.log('❌ Conversation engine test FAILED');
      return false;
    }
  } catch (error) {
    console.error('❌ Conversation engine test ERROR:', error);
    return false;
  }
}

async function testMetaCredentials() {
  console.log('🧪 Testing Meta WhatsApp API credentials...');
  
  const requiredEnvVars = [
    'META_ACCESS_TOKEN',
    'META_PHONE_NUMBER_ID',
    'META_VERIFY_TOKEN',
    'META_APP_SECRET'
  ];
  
  let allPresent = true;
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: Present (${value.length} chars)`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
      allPresent = false;
    }
  }
  
  if (allPresent) {
    console.log('✅ All Meta WhatsApp API credentials are present');
  } else {
    console.log('❌ Some Meta WhatsApp API credentials are missing');
  }
  
  return allPresent;
}

async function main() {
  console.log('🚀 Starting Meta WhatsApp webhook tests...\n');
  
  const results = {
    credentials: await testMetaCredentials(),
    webhookVerification: await testWebhookVerification(),
    conversationEngine: await testConversationEngine()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Meta Credentials: ${results.credentials ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Webhook Verification: ${results.webhookVerification ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Conversation Engine: ${results.conversationEngine ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All tests PASSED! Meta WhatsApp integration is working correctly.');
  } else {
    console.log('\n⚠️ Some tests FAILED. Check the issues above.');
    
    if (!results.credentials) {
      console.log('\n🔧 To fix credential issues:');
      console.log('1. Set META_ACCESS_TOKEN in your environment');
      console.log('2. Set META_PHONE_NUMBER_ID in your environment');
      console.log('3. Set META_VERIFY_TOKEN in your environment');
      console.log('4. Set META_APP_SECRET in your environment');
    }
    
    if (!results.webhookVerification) {
      console.log('\n🔧 To fix webhook verification:');
      console.log('1. Ensure META_VERIFY_TOKEN matches what you set in Meta');
      console.log('2. Check that the webhook URL is accessible');
      console.log('3. Verify the server is running');
    }
  }
}

main().catch(console.error);
