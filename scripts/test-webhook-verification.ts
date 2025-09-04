#!/usr/bin/env tsx

/**
 * Test script to verify Meta webhook verification works correctly
 * Tests the exact GET handler at /api/webhook
 */

import fetch from 'node-fetch';

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://whatsappdashboard-1.onrender.com/api/webhook';
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '098765';

/**
 * Test webhook verification with correct token
 */
async function testWebhookVerificationSuccess() {
  console.log('🔍 Testing webhook verification with correct token...');
  
  try {
    const challenge = 'test-challenge-12345';
    const url = `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${META_VERIFY_TOKEN}&hub.challenge=${challenge}`;
    
    console.log(`📡 Making request to: ${url}`);
    
    const response = await fetch(url);
    const responseText = await response.text();
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📄 Response body: "${responseText}"`);
    
    if (response.ok && responseText === challenge) {
      console.log('✅ Webhook verification successful - challenge echoed correctly');
      return true;
    } else {
      console.log('❌ Webhook verification failed - challenge not echoed correctly');
      return false;
    }
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    return false;
  }
}

/**
 * Test webhook verification with incorrect token
 */
async function testWebhookVerificationFailure() {
  console.log('🔍 Testing webhook verification with incorrect token...');
  
  try {
    const challenge = 'test-challenge-67890';
    const wrongToken = 'wrong-token';
    const url = `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${wrongToken}&hub.challenge=${challenge}`;
    
    console.log(`📡 Making request to: ${url}`);
    
    const response = await fetch(url);
    const responseText = await response.text();
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📄 Response body: "${responseText}"`);
    
    if (response.status === 403) {
      console.log('✅ Webhook verification correctly rejected wrong token');
      return true;
    } else {
      console.log('❌ Webhook verification should have rejected wrong token');
      return false;
    }
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    return false;
  }
}

/**
 * Test webhook verification with missing parameters
 */
async function testWebhookVerificationMissingParams() {
  console.log('🔍 Testing webhook verification with missing parameters...');
  
  try {
    const url = `${WEBHOOK_URL}?hub.mode=subscribe`;
    
    console.log(`📡 Making request to: ${url}`);
    
    const response = await fetch(url);
    const responseText = await response.text();
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📄 Response body: "${responseText}"`);
    
    if (response.status === 403) {
      console.log('✅ Webhook verification correctly rejected missing parameters');
      return true;
    } else {
      console.log('❌ Webhook verification should have rejected missing parameters');
      return false;
    }
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Meta webhook verification tests...\n');
  console.log(`🎯 Testing webhook URL: ${WEBHOOK_URL}`);
  console.log(`🔑 Using verify token: ${META_VERIFY_TOKEN}\n`);
  
  const tests = [
    { name: 'Correct Token Verification', fn: testWebhookVerificationSuccess },
    { name: 'Wrong Token Rejection', fn: testWebhookVerificationFailure },
    { name: 'Missing Parameters Rejection', fn: testWebhookVerificationMissingParams }
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
    console.log('🎉 All tests passed! Meta webhook verification is working correctly.');
    console.log('✅ You can now configure Meta to use this webhook URL.');
  } else {
    console.log('⚠️ Some tests failed. Please check the logs above for details.');
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, testWebhookVerificationSuccess, testWebhookVerificationFailure, testWebhookVerificationMissingParams };
