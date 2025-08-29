import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testLocationUpdateEndpoint() {
  try {
    const apiBaseUrl = process.env.API_BASE_URL || 'https://whatsappdashboard-1.onrender.com';
    
    console.log('🧪 Testing Location Update Endpoint');
    console.log('===================================');
    console.log(`📡 API Base URL: ${apiBaseUrl}`);
    
    // Test 1: Check if the endpoint exists
    console.log('\n📤 Test 1: Testing /api/webhook/send-location-update-to-all endpoint...');
    
    try {
      const response = await axios.post(`${apiBaseUrl}/api/webhook/send-location-update-to-all`, {}, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 second timeout
      });
      
      console.log('✅ Endpoint Response:');
      console.log(`Status: ${response.status}`);
      console.log('Data:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Endpoint Error:');
        console.error(`Status: ${error.response?.status}`);
        console.error(`Status Text: ${error.response?.statusText}`);
        console.error('Response Data:', error.response?.data);
        console.error('Error Message:', error.message);
        
        if (error.response?.status === 502) {
          console.log('\n🔧 502 Error Analysis:');
          console.log('- This usually means the server is not responding properly');
          console.log('- Could be due to Twilio client not being initialized');
          console.log('- Or server timeout/crash');
        }
      } else {
        console.error('❌ Unexpected error:', error);
      }
    }
    
    // Test 2: Check server health
    console.log('\n📤 Test 2: Checking server health...');
    
    try {
      const healthResponse = await axios.get(`${apiBaseUrl}/api/health`, {
        timeout: 10000
      });
      
      console.log('✅ Server Health:');
      console.log(`Status: ${healthResponse.status}`);
      console.log('Data:', JSON.stringify(healthResponse.data, null, 2));
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Server Health Error:');
        console.error(`Status: ${error.response?.status}`);
        console.error('Response Data:', error.response?.data);
      } else {
        console.error('❌ Unexpected error:', error);
      }
    }
    
    // Test 3: Check if webhook endpoint is accessible
    console.log('\n📤 Test 3: Testing webhook endpoint accessibility...');
    
    try {
      const webhookResponse = await axios.get(`${apiBaseUrl}/api/webhook/loan-replies`, {
        timeout: 10000
      });
      
      console.log('✅ Webhook Endpoint Accessible:');
      console.log(`Status: ${webhookResponse.status}`);
      console.log(`Loan Replies Count: ${webhookResponse.data.length}`);
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Webhook Endpoint Error:');
        console.error(`Status: ${error.response?.status}`);
        console.error('Response Data:', error.response?.data);
      } else {
        console.error('❌ Unexpected error:', error);
      }
    }
    
    console.log('\n📋 Summary:');
    console.log('- If you see 502 errors, the server may need to be restarted');
    console.log('- Check if Twilio credentials are properly set in environment variables');
    console.log('- Verify the server is running and accessible');
    console.log('- Check server logs for any errors during startup');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLocationUpdateEndpoint();
