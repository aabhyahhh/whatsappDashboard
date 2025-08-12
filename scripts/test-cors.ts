import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test CORS configuration
async function testCORS() {
  try {
    const apiBaseUrl = 'https://whatsappdashboard-1.onrender.com';
    
    console.log('🧪 Testing CORS Configuration');
    console.log('==============================');
    console.log(`📡 API Base URL: ${apiBaseUrl}`);
    
    // Test 1: Test contacts endpoint
    console.log('\n📤 Test 1: Testing contacts endpoint...');
    try {
      const contactsResponse = await axios.get(`${apiBaseUrl}/api/contacts`, {
        headers: {
          'Origin': 'https://admin.laarikhojo.in',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Contacts endpoint CORS test passed');
      console.log('✅ Response status:', contactsResponse.status);
      console.log('✅ CORS headers:', {
        'access-control-allow-origin': contactsResponse.headers['access-control-allow-origin'],
        'access-control-allow-credentials': contactsResponse.headers['access-control-allow-credentials'],
        'access-control-allow-methods': contactsResponse.headers['access-control-allow-methods']
      });
    } catch (error) {
      console.log('❌ Contacts endpoint CORS test failed');
      if (axios.isAxiosError(error)) {
        console.log('❌ Error status:', error.response?.status);
        console.log('❌ Error data:', error.response?.data);
        console.log('❌ CORS headers:', error.response?.headers);
      }
    }
    
    // Test 2: Test messages endpoint
    console.log('\n📤 Test 2: Testing messages endpoint...');
    try {
      const messagesResponse = await axios.get(`${apiBaseUrl}/api/messages`, {
        headers: {
          'Origin': 'https://admin.laarikhojo.in',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Messages endpoint CORS test passed');
      console.log('✅ Response status:', messagesResponse.status);
      console.log('✅ CORS headers:', {
        'access-control-allow-origin': messagesResponse.headers['access-control-allow-origin'],
        'access-control-allow-credentials': messagesResponse.headers['access-control-allow-credentials'],
        'access-control-allow-methods': messagesResponse.headers['access-control-allow-methods']
      });
    } catch (error) {
      console.log('❌ Messages endpoint CORS test failed');
      if (axios.isAxiosError(error)) {
        console.log('❌ Error status:', error.response?.status);
        console.log('❌ Error data:', error.response?.data);
        console.log('❌ CORS headers:', error.response?.headers);
      }
    }
    
    // Test 3: Test OPTIONS preflight request
    console.log('\n📤 Test 3: Testing OPTIONS preflight request...');
    try {
      const optionsResponse = await axios.options(`${apiBaseUrl}/api/contacts`, {
        headers: {
          'Origin': 'https://admin.laarikhojo.in',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      console.log('✅ OPTIONS preflight test passed');
      console.log('✅ Response status:', optionsResponse.status);
      console.log('✅ CORS headers:', {
        'access-control-allow-origin': optionsResponse.headers['access-control-allow-origin'],
        'access-control-allow-credentials': optionsResponse.headers['access-control-allow-credentials'],
        'access-control-allow-methods': optionsResponse.headers['access-control-allow-methods'],
        'access-control-allow-headers': optionsResponse.headers['access-control-allow-headers']
      });
    } catch (error) {
      console.log('❌ OPTIONS preflight test failed');
      if (axios.isAxiosError(error)) {
        console.log('❌ Error status:', error.response?.status);
        console.log('❌ Error data:', error.response?.data);
      }
    }
    
    // Test 4: Test with different origin
    console.log('\n📤 Test 4: Testing with localhost origin...');
    try {
      const localhostResponse = await axios.get(`${apiBaseUrl}/api/contacts`, {
        headers: {
          'Origin': 'http://localhost:5173',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Localhost origin test passed');
      console.log('✅ Response status:', localhostResponse.status);
    } catch (error) {
      console.log('❌ Localhost origin test failed');
      if (axios.isAxiosError(error)) {
        console.log('❌ Error status:', error.response?.status);
      }
    }
    
    console.log('\n✅ CORS test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Check if all endpoints are accessible from admin.laarikhojo.in');
    console.log('   - Verify CORS headers are properly set');
    console.log('   - Ensure preflight requests are handled');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

// Run the test
testCORS();
