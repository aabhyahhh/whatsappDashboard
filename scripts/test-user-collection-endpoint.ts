import fetch from 'node-fetch';

const BASE_URL = 'https://whatsappdashboard-1.onrender.com/api/webhook';

async function testInactiveVendorsWithUserCollection() {
  try {
    console.log('🧪 Testing inactive vendors endpoint with User collection...');
    const response = await fetch(`${BASE_URL}/inactive-vendors?page=1&limit=10`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Inactive vendors endpoint - Status: ${response.status}`);
      console.log(`📊 Response type: ${typeof data}`);
      
      if (data.vendors) {
        console.log(`📈 Vendors count: ${data.vendors.length}`);
        console.log(`📄 Pagination: Page ${data.pagination?.page || 'N/A'} of ${data.pagination?.pages || 'N/A'}`);
        
        if (data.vendors.length > 0) {
          console.log('\n📋 Sample inactive vendor from User collection:');
          const sampleVendor = data.vendors[0];
          console.log(`   Name: ${sampleVendor.name}`);
          console.log(`   Phone: ${sampleVendor.contactNumber}`);
          console.log(`   Status: ${sampleVendor.status || 'N/A'}`);
          console.log(`   Last Interaction: ${sampleVendor.lastInteractionDate || 'Never'}`);
          console.log(`   Days Inactive: ${sampleVendor.daysInactive || 'Unknown'}`);
          console.log(`   Updated At: ${sampleVendor.updatedAt || 'N/A'}`);
        } else {
          console.log('📝 No inactive vendors found (all users have interacted in the last 3 days)');
        }
      }
    } else {
      console.log(`❌ Inactive vendors endpoint - Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`📝 Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`💥 Inactive vendors endpoint - Error: ${error.message}`);
  }
}

async function testAllEndpoints() {
  console.log('🚀 Testing inactive vendors with users collection...');
  console.log('📅 Looking for users who haven\'t interacted in the last 5 days');
  console.log('💬 Checking for inbound messages (user interactions)');
  console.log('🗄️ Using users collection from test database\n');
  
  await testInactiveVendorsWithUserCollection();
  
  console.log('\n✨ Testing completed!');
  console.log('\n📝 Expected behavior:');
  console.log('   - Only users who haven\'t sent inbound messages in 5+ days should appear');
  console.log('   - When a user sends a message, they should disappear from this list');
  console.log('   - The list should update in real-time based on actual interactions');
  console.log('   - Data should come from the users collection in the test database');
}

testAllEndpoints().catch(console.error);
