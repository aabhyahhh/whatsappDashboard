import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test duplicate message prevention
async function testDuplicatePrevention() {
  try {
    const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook';
    
    console.log('🧪 Testing Duplicate Message Prevention');
    console.log('=======================================');
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    
    // Test 1: Send "hi" message
    console.log('\n📤 Test 1: Sending "hi" message...');
    const hiPayload = {
      From: 'whatsapp:+919265466535',
      To: 'whatsapp:+1234567890',
      Body: 'hi',
      ButtonPayload: null
    };

    const response1 = await axios.post(webhookUrl, hiPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ First "hi" response:', response1.status);
    
    // Wait 2 seconds
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Send "hi" message again (should be prevented)
    console.log('\n📤 Test 2: Sending "hi" message again (should be prevented)...');
    const response2 = await axios.post(webhookUrl, hiPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Second "hi" response:', response2.status);
    
    // Wait 2 seconds
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Send "loan" message
    console.log('\n📤 Test 3: Sending "loan" message...');
    const loanPayload = {
      From: 'whatsapp:+919265466535',
      To: 'whatsapp:+1234567890',
      Body: 'loan',
      ButtonPayload: null
    };

    const response3 = await axios.post(webhookUrl, loanPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ First "loan" response:', response3.status);
    
    // Wait 2 seconds
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Send "loan" message again (should be prevented)
    console.log('\n📤 Test 4: Sending "loan" message again (should be prevented)...');
    const response4 = await axios.post(webhookUrl, loanPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Second "loan" response:', response4.status);
    
    // Wait 35 seconds to test if prevention expires
    console.log('\n⏳ Waiting 35 seconds for prevention to expire...');
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    // Test 5: Send "hi" message again (should work after 35 seconds)
    console.log('\n📤 Test 5: Sending "hi" message after 35 seconds (should work)...');
    const response5 = await axios.post(webhookUrl, hiPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Third "hi" response:', response5.status);
    
    console.log('\n✅ Duplicate prevention test completed!');
    console.log('📋 Check the logs to see if duplicates were prevented.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

// Run the test
testDuplicatePrevention();
