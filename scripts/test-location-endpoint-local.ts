import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testLocationEndpointLocal() {
  try {
    const localApiUrl = 'http://localhost:3000';
    
    console.log('🧪 Testing Location Update Endpoint (Local)');
    console.log('===========================================');
    console.log(`📡 Local API URL: ${localApiUrl}`);
    
    // Test the endpoint locally
    console.log('\n📤 Testing /api/webhook/send-location-update-to-all endpoint...');
    
    try {
      const response = await axios.post(`${localApiUrl}/api/webhook/send-location-update-to-all`, {}, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 second timeout
      });
      
      console.log('✅ Local Endpoint Response:');
      console.log(`Status: ${response.status}`);
      console.log('Data:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Local Endpoint Error:');
        console.error(`Status: ${error.response?.status}`);
        console.error(`Status Text: ${error.response?.statusText}`);
        console.error('Response Data:', error.response?.data);
        console.error('Error Message:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
          console.log('\n🔧 Connection Refused:');
          console.log('- Make sure the local server is running on port 3000');
          console.log('- Run: npm run auth-server');
        }
      } else {
        console.error('❌ Unexpected error:', error);
      }
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. If local test works, the issue is with the production server');
    console.log('2. If local test fails, check Twilio credentials and server setup');
    console.log('3. Run: npm run test-location-endpoint (for production test)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLocationEndpointLocal();
