#!/usr/bin/env tsx

/**
 * Test script for the send-reminder-to-all endpoint
 * This tests the bulk reminder functionality
 */

import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://whatsappdashboard-1.onrender.com';

async function testSendReminderToAll() {
  console.log('🧪 Testing Send Reminder to All Endpoint...');
  console.log(`📍 Endpoint: ${PRODUCTION_URL}/api/webhook/send-reminder-to-all`);
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/webhook/send-reminder-to-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Endpoint working correctly!');
      console.log('\n📋 Response Data:');
      console.log(`  Success: ${data.success}`);
      console.log(`  Message: ${data.message}`);
      console.log(`  Sent: ${data.sent}`);
      console.log(`  Skipped: ${data.skipped}`);
      console.log(`  Errors: ${data.errors}`);
      
      if (data.errorDetails && data.errorDetails.length > 0) {
        console.log('\n❌ Error Details:');
        data.errorDetails.forEach((error: string, index: number) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
    } else {
      console.log('❌ Endpoint failed!');
      const errorText = await response.text();
      console.log(`Error response: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('404')) {
      console.log('🔍 This suggests the endpoint is not deployed yet');
    }
  }
}

// Test the endpoint
testSendReminderToAll();
