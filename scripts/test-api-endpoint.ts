import path from 'path';
import dotenv from 'dotenv';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://whatsappdashboard-1.onrender.com';

async function testAPIEndpoint() {
  try {
    console.log('🧪 TESTING API ENDPOINT DIRECTLY');
    console.log('================================');
    console.log(`API Base URL: ${API_BASE_URL}`);
    
    const response = await fetch(`${API_BASE_URL}/api/webhook/inactive-vendors`);
    
    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ API Response Status: ${response.status}`);
    console.log(`📊 Total vendors returned: ${data.length}`);
    
    if (data.length === 0) {
      console.log('ℹ️ No inactive vendors returned from API');
      return;
    }
    
    // Check the first vendor's data structure
    const firstVendor = data[0];
    console.log('\n📋 First vendor data structure:');
    console.log(JSON.stringify(firstVendor, null, 2));
    
    // Check if reminderStatus field exists
    console.log('\n🔍 Checking reminderStatus field:');
    console.log(`- reminderStatus: ${firstVendor.reminderStatus}`);
    console.log(`- reminderStatus type: ${typeof firstVendor.reminderStatus}`);
    console.log(`- reminderSentAt: ${firstVendor.reminderSentAt}`);
    
    // Check all vendors for reminderStatus
    const undefinedStatus = data.filter((v: any) => v.reminderStatus === undefined).length;
    const sentStatus = data.filter((v: any) => v.reminderStatus === 'Sent').length;
    const notSentStatus = data.filter((v: any) => v.reminderStatus === 'Not sent').length;
    
    console.log('\n📊 Reminder Status Distribution:');
    console.log(`- Undefined: ${undefinedStatus}`);
    console.log(`- Sent: ${sentStatus}`);
    console.log(`- Not sent: ${notSentStatus}`);
    
    if (undefinedStatus > 0) {
      console.log('\n⚠️  ISSUE: Some vendors have undefined reminderStatus!');
      console.log('This suggests the API endpoint is not working correctly.');
    }
    
  } catch (error) {
    console.error('❌ Error testing API endpoint:', error);
  }
}

testAPIEndpoint();
