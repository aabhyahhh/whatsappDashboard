#!/usr/bin/env tsx

/**
 * Test script to verify webhook ping endpoint works
 */

import axios from 'axios';
import 'dotenv/config';

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://whatsappdashboard-1.onrender.com'
  : 'http://localhost:5000';

async function testWebhookPing() {
  console.log('🏓 Testing webhook ping endpoint...\n');
  
  try {
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/api/webhook/ping`, {
      ping: 'ok'
    });
    const endTime = Date.now();
    
    console.log('✅ Ping test successful!');
    console.log(`📝 Status: ${response.status}`);
    console.log(`📝 Response: ${JSON.stringify(response.data, null, 2)}`);
    console.log(`📝 Response time: ${endTime - startTime}ms`);
    
    if (endTime - startTime < 100) {
      console.log('🚀 Excellent! Response time under 100ms');
    } else if (endTime - startTime < 1000) {
      console.log('✅ Good! Response time under 1 second');
    } else {
      console.log('⚠️ Slow response time - may need optimization');
    }
    
  } catch (error: any) {
    console.error('❌ Ping test failed:', error.message);
    if (error.response) {
      console.error(`📝 Status: ${error.response.status}`);
      console.error(`📝 Response: ${error.response.data}`);
    }
  }
}

async function testWebhookVerification() {
  console.log('\n🔍 Testing webhook verification endpoint...\n');
  
  try {
    const verifyToken = process.env.META_VERIFY_TOKEN || 'test_token';
    const challenge = 'test_challenge_123';
    
    const startTime = Date.now();
    const response = await axios.get(`${BASE_URL}/api/webhook`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': challenge
      }
    });
    const endTime = Date.now();
    
    if (response.data === challenge) {
      console.log('✅ Webhook verification working correctly');
      console.log(`📝 Challenge echoed: ${response.data}`);
      console.log(`📝 Response time: ${endTime - startTime}ms`);
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

async function main() {
  console.log('🚀 Starting Webhook Tests...\n');
  console.log(`🌐 Testing against: ${BASE_URL}\n`);
  
  await testWebhookPing();
  await testWebhookVerification();
  
  console.log('\n✨ Tests completed!');
}

main().catch(console.error);
