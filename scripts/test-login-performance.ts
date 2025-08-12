import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test login performance
async function testLoginPerformance() {
  try {
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    
    console.log('🧪 Testing Login Performance Optimizations');
    console.log('==========================================');
    console.log(`📡 API Base URL: ${apiBaseUrl}`);
    
    // Test 1: Login performance
    console.log('\n📤 Test 1: Testing login performance...');
    const loginStartTime = Date.now();
    
    try {
      const loginResponse = await axios.post(`${apiBaseUrl}/api/auth`, {
        username: 'admin',
        password: 'L@@riKh0j0'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const loginTime = Date.now() - loginStartTime;
      console.log('✅ Login successful');
      console.log('✅ Login time:', loginTime + 'ms');
      console.log('✅ Response status:', loginResponse.status);
      
      const token = loginResponse.data.token;
      
      // Test 2: Dashboard stats performance
      console.log('\n📤 Test 2: Testing dashboard stats performance...');
      const statsStartTime = Date.now();
      
      try {
        const statsResponse = await axios.get(`${apiBaseUrl}/api/dashboard-stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });
        
        const statsTime = Date.now() - statsStartTime;
        console.log('✅ Dashboard stats successful');
        console.log('✅ Stats time:', statsTime + 'ms');
        console.log('✅ Response status:', statsResponse.status);
        console.log('✅ Stats data:', statsResponse.data);
        
      } catch (statsError) {
        console.log('❌ Dashboard stats failed:', statsError.message);
      }
      
      // Test 3: CORS preflight performance
      console.log('\n📤 Test 3: Testing CORS preflight performance...');
      const preflightStartTime = Date.now();
      
      try {
        const preflightResponse = await axios.options(`${apiBaseUrl}/api/auth`, {
          headers: {
            'Origin': 'https://admin.laarikhojo.in',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
          }
        });
        
        const preflightTime = Date.now() - preflightStartTime;
        console.log('✅ CORS preflight successful');
        console.log('✅ Preflight time:', preflightTime + 'ms');
        console.log('✅ Response status:', preflightResponse.status);
        
      } catch (preflightError) {
        console.log('❌ CORS preflight failed:', preflightError.message);
      }
      
    } catch (loginError) {
      const loginTime = Date.now() - loginStartTime;
      console.log('❌ Login failed after', loginTime + 'ms');
      console.log('❌ Error:', loginError.message);
    }
    
    // Test 4: Health check performance
    console.log('\n📤 Test 4: Testing health check performance...');
    const healthStartTime = Date.now();
    
    try {
      const healthResponse = await axios.get(`${apiBaseUrl}/api/health`);
      const healthTime = Date.now() - healthStartTime;
      console.log('✅ Health check successful');
      console.log('✅ Health check time:', healthTime + 'ms');
      console.log('✅ Response status:', healthResponse.status);
      
    } catch (healthError) {
      console.log('❌ Health check failed:', healthError.message);
    }
    
    console.log('\n✅ Login performance test completed!');
    console.log('\n📋 Performance Summary:');
    console.log('   - Login should complete in < 500ms');
    console.log('   - Dashboard stats should load in < 1000ms');
    console.log('   - CORS preflight should complete in < 100ms');
    console.log('   - Health check should complete in < 200ms');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

// Run the test
testLoginPerformance();
