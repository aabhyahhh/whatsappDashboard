#!/usr/bin/env tsx

/**
 * Test script for the support call button functionality
 * Tests the API endpoint that sends support call messages to vendors
 */

import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://whatsappdashboard-1.onrender.com';
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-test-jwt-token';

// Test data
const testVendor = {
  contactNumber: '+919876543210',
  name: 'Test Vendor',
  template: 'post_support_call_message_for_vendors_util'
};

/**
 * Test sending support call message
 */
async function testSendSupportCall() {
  console.log('📞 Testing support call message sending...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/messages/send-support-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({
        to: testVendor.contactNumber,
        vendorName: testVendor.name,
        template: testVendor.template
      }),
    });
    
    const result = await response.json() as { success?: boolean; error?: string; message?: string };
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📄 Response body:`, JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('✅ Support call message sent successfully');
      return true;
    } else {
      console.log('❌ Support call message failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending support call message:', error);
    return false;
  }
}

/**
 * Test with missing required fields
 */
async function testMissingFields() {
  console.log('🔍 Testing with missing required fields...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/messages/send-support-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({
        // Missing to and vendorName
        template: testVendor.template
      }),
    });
    
    const result = await response.json() as { success?: boolean; error?: string; message?: string };
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📄 Response body:`, JSON.stringify(result, null, 2));
    
    if (response.status === 400) {
      console.log('✅ Correctly rejected request with missing fields');
      return true;
    } else {
      console.log('❌ Should have rejected request with missing fields');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing missing fields:', error);
    return false;
  }
}

/**
 * Test without authentication token
 */
async function testWithoutAuth() {
  console.log('🔍 Testing without authentication token...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/messages/send-support-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header
      },
      body: JSON.stringify({
        to: testVendor.contactNumber,
        vendorName: testVendor.name,
        template: testVendor.template
      }),
    });
    
    const result = await response.json() as { success?: boolean; error?: string; message?: string };
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📄 Response body:`, JSON.stringify(result, null, 2));
    
    if (response.status === 401 || response.status === 403) {
      console.log('✅ Correctly rejected request without authentication');
      return true;
    } else {
      console.log('❌ Should have rejected request without authentication');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing without auth:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting support call button tests...\n');
  console.log(`🎯 Testing API URL: ${API_BASE_URL}/api/messages/send-support-call`);
  console.log(`📱 Test vendor: ${testVendor.name} (${testVendor.contactNumber})\n`);
  
  const tests = [
    { name: 'Send Support Call Message', fn: testSendSupportCall },
    { name: 'Missing Required Fields', fn: testMissingFields },
    { name: 'Without Authentication', fn: testWithoutAuth }
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
    console.log('🎉 All tests passed! Support call button functionality is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the logs above for details.');
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, testSendSupportCall, testMissingFields, testWithoutAuth };
