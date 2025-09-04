#!/usr/bin/env tsx

/**
 * Test script to check environment variables and Meta WhatsApp API connectivity
 */

import axios from 'axios';
import 'dotenv/config';

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://whatsappdashboard-1.onrender.com'
  : 'http://localhost:5000';

async function testEnvironmentVariables() {
  console.log('🔍 Testing Environment Variables...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/debug/env`);
    console.log('✅ Environment Variables Status:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check if all required variables are set
    const data = response.data;
    const requiredVars = [
      'META_ACCESS_TOKEN',
      'META_PHONE_NUMBER_ID', 
      'META_VERIFY_TOKEN',
      'META_APP_SECRET',
      'RELAY_SECRET',
      'MONGODB_URI',
      'JWT_SECRET'
    ];
    
    console.log('\n📋 Required Variables Check:');
    let allSet = true;
    requiredVars.forEach(varName => {
      const status = data[varName] === 'SET' ? '✅' : '❌';
      console.log(`${status} ${varName}: ${data[varName]}`);
      if (data[varName] !== 'SET') allSet = false;
    });
    
    if (allSet) {
      console.log('\n🎉 All required environment variables are set!');
    } else {
      console.log('\n⚠️ Some environment variables are missing. Check your Render dashboard.');
    }
    
  } catch (error: any) {
    console.error('❌ Failed to check environment variables:', error.message);
  }
}

async function testWebhookVerification() {
  console.log('\n🔍 Testing Webhook Verification...\n');
  
  try {
    const verifyToken = process.env.META_VERIFY_TOKEN || 'test_token';
    const challenge = 'test_challenge_123';
    
    const response = await axios.get(`${BASE_URL}/api/webhook`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': challenge
      }
    });
    
    if (response.data === challenge) {
      console.log('✅ Webhook verification working correctly');
      console.log(`📝 Challenge echoed: ${response.data}`);
    } else {
      console.log('❌ Webhook verification failed');
      console.log(`📝 Expected: ${challenge}`);
      console.log(`📝 Received: ${response.data}`);
    }
    
  } catch (error: any) {
    console.error('❌ Webhook verification failed:', error.message);
    if (error.response) {
      console.error(`📝 Status: ${error.response.status}`);
      console.error(`📝 Response: ${error.response.data}`);
    }
  }
}

async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check passed:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
  }
}

async function testMetaCredentials() {
  console.log('\n🔍 Testing Meta Credentials...\n');
  
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  
  if (!accessToken || !phoneNumberId) {
    console.log('❌ Meta credentials not available in local environment');
    console.log('📝 This is expected if running locally without .env file');
    return;
  }
  
  try {
    // Test Meta API connectivity
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    console.log('✅ Meta API connectivity test passed');
    console.log(`📝 Phone Number ID: ${response.data.id}`);
    console.log(`📝 Display Name: ${response.data.display_phone_number}`);
    
  } catch (error: any) {
    console.error('❌ Meta API connectivity test failed:', error.message);
    if (error.response) {
      console.error(`📝 Status: ${error.response.status}`);
      console.error(`📝 Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

async function main() {
  console.log('🚀 Starting Environment Variables Test...\n');
  console.log(`🌐 Testing against: ${BASE_URL}\n`);
  
  await testEnvironmentVariables();
  await testWebhookVerification();
  await testHealthCheck();
  await testMetaCredentials();
  
  console.log('\n✨ Test completed!');
}

main().catch(console.error);
