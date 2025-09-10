#!/usr/bin/env tsx

/**
 * Test script to verify the loan-replies endpoint is working
 */

import fetch from 'node-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';

async function testLoanRepliesEndpoint() {
  console.log('🧪 Testing loan-replies endpoint...');
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  
  try {
    // Test the webhook endpoint (what frontend is trying to access)
    console.log('\n1️⃣ Testing /api/webhook/loan-replies...');
    const webhookResponse = await fetch(`${API_BASE_URL}/api/webhook/loan-replies`);
    
    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      console.log(`✅ /api/webhook/loan-replies - Status: ${webhookResponse.status}`);
      console.log(`📊 Found ${webhookData.length} loan reply logs`);
      if (webhookData.length > 0) {
        console.log(`📝 Latest log: ${JSON.stringify(webhookData[0], null, 2)}`);
      }
    } else {
      console.log(`❌ /api/webhook/loan-replies - Status: ${webhookResponse.status}`);
      const errorText = await webhookResponse.text();
      console.log(`❌ Error: ${errorText}`);
    }
    
    // Test the meta-health endpoint (alternative)
    console.log('\n2️⃣ Testing /api/meta-health/meta-loan-replies...');
    const metaResponse = await fetch(`${API_BASE_URL}/api/meta-health/meta-loan-replies`);
    
    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      console.log(`✅ /api/meta-health/meta-loan-replies - Status: ${metaResponse.status}`);
      console.log(`📊 Found ${metaData.length} loan reply logs`);
    } else {
      console.log(`❌ /api/meta-health/meta-loan-replies - Status: ${metaResponse.status}`);
      const errorText = await metaResponse.text();
      console.log(`❌ Error: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error);
  }
}

// Run the test
testLoanRepliesEndpoint().catch(console.error);
