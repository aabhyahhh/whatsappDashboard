import 'dotenv/config';

const API_BASE_URL = 'https://whatsappdashboard-1.onrender.com';

async function testInactiveVendorsEndpoint() {
  try {
    console.log('🧪 Testing inactive vendors endpoint...');
    console.log(`📡 API URL: ${API_BASE_URL}/api/webhook/inactive-vendors`);
    
    // Test 1: Basic endpoint test
    console.log('\n1️⃣ Testing basic endpoint...');
    const response = await fetch(`${API_BASE_URL}/api/webhook/inactive-vendors?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   Error Response: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`   ✅ Success! Found ${data.vendors?.length || 0} vendors`);
    console.log(`   📊 Pagination: ${data.pagination?.totalCount || 0} total vendors`);
    console.log(`   ⚡ Performance: ${data.performance?.duration || 'N/A'}`);
    
    // Test 2: Check CORS headers
    console.log('\n2️⃣ Testing CORS headers...');
    const corsResponse = await fetch(`${API_BASE_URL}/api/webhook/inactive-vendors`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma'
      }
    });
    
    console.log(`   CORS Status: ${corsResponse.status}`);
    console.log(`   CORS Headers:`, Object.fromEntries(corsResponse.headers.entries()));
    
    // Test 3: Test with different headers
    console.log('\n3️⃣ Testing with cache headers...');
    const cacheResponse = await fetch(`${API_BASE_URL}/api/webhook/inactive-vendors?page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log(`   Cache Test Status: ${cacheResponse.status}`);
    if (cacheResponse.ok) {
      const cacheData = await cacheResponse.json();
      console.log(`   ✅ Cache test successful! Found ${cacheData.vendors?.length || 0} vendors`);
    } else {
      const errorText = await cacheResponse.text();
      console.log(`   ❌ Cache test failed: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Full error:', error);
  }
}

testInactiveVendorsEndpoint();
