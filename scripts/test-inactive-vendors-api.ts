import path from 'path';
import dotenv from 'dotenv';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://whatsappdashboard-1.onrender.com';

async function testInactiveVendorsAPI() {
  try {
    console.log('🧪 TESTING INACTIVE VENDORS API ENDPOINT');
    console.log('========================================');
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
    
    // Show first 3 vendors with their data
    console.log('\n📋 Sample vendor data from API:');
    data.slice(0, 3).forEach((vendor: any, index: number) => {
      console.log(`\n${index + 1}. ${vendor.name} (${vendor.phone})`);
      console.log(`   - _id: ${vendor._id}`);
      console.log(`   - lastSeen: ${vendor.lastSeen}`);
      console.log(`   - daysInactive: ${vendor.daysInactive}`);
      console.log(`   - reminderStatus: ${vendor.reminderStatus}`);
      console.log(`   - reminderSentAt: ${vendor.reminderSentAt || 'null'}`);
    });
    
    // Check if reminderStatus is consistent
    const sentCount = data.filter((v: any) => v.reminderStatus === 'Sent').length;
    const notSentCount = data.filter((v: any) => v.reminderStatus === 'Not sent').length;
    
    console.log(`\n📊 Reminder Status Summary:`);
    console.log(`- Sent: ${sentCount} vendors`);
    console.log(`- Not sent: ${notSentCount} vendors`);
    
    if (notSentCount === data.length) {
      console.log('\n⚠️  ISSUE DETECTED: All vendors show "Not sent" status!');
      console.log('This suggests the backend is not properly checking the SupportCallReminderLog.');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testInactiveVendorsAPI();
