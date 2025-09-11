import path from 'path';
import dotenv from 'dotenv';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://whatsappdashboard-1.onrender.com';

async function testPerformanceImprovements() {
  try {
    console.log('🚀 TESTING PERFORMANCE IMPROVEMENTS');
    console.log('===================================');
    console.log(`API Base URL: ${API_BASE_URL}`);
    
    // Test 1: Old API format (if still available)
    console.log('\n📊 Test 1: Checking if old API format still works...');
    try {
      const oldResponse = await fetch(`${API_BASE_URL}/api/webhook/inactive-vendors`);
      if (oldResponse.ok) {
        const oldData = await oldResponse.json();
        console.log(`✅ Old API format: ${oldData.length} vendors returned`);
      }
    } catch (error) {
      console.log('ℹ️ Old API format not available (expected)');
    }
    
    // Test 2: New optimized API with pagination
    console.log('\n📊 Test 2: Testing new optimized API...');
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}/api/webhook/inactive-vendors?page=1&limit=50`);
    
    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ New API Response Status: ${response.status}`);
    console.log(`⏱️ Response Time: ${duration}ms`);
    
    if (data.vendors && data.pagination) {
      console.log(`📊 Vendors returned: ${data.vendors.length}`);
      console.log(`📊 Total vendors: ${data.pagination.total}`);
      console.log(`📊 Current page: ${data.pagination.page}`);
      console.log(`📊 Total pages: ${data.pagination.pages}`);
      console.log(`📊 Performance: ${data.performance?.duration || 'Not provided'}`);
      
      // Check if reminder status is working
      const sentCount = data.vendors.filter((v: any) => v.reminderStatus === 'Sent').length;
      const notSentCount = data.vendors.filter((v: any) => v.reminderStatus === 'Not sent').length;
      
      console.log(`📊 Reminder Status:`);
      console.log(`  - Sent: ${sentCount}`);
      console.log(`  - Not sent: ${notSentCount}`);
      
      // Show sample vendor data
      if (data.vendors.length > 0) {
        const sampleVendor = data.vendors[0];
        console.log(`\n📋 Sample vendor data:`);
        console.log(`  - Name: ${sampleVendor.name}`);
        console.log(`  - Phone: ${sampleVendor.phone}`);
        console.log(`  - Days inactive: ${sampleVendor.daysInactive}`);
        console.log(`  - Reminder status: ${sampleVendor.reminderStatus}`);
        console.log(`  - Reminder sent at: ${sampleVendor.reminderSentAt || 'null'}`);
      }
      
      // Performance comparison
      console.log(`\n🎯 PERFORMANCE ANALYSIS:`);
      if (duration < 1000) {
        console.log(`✅ EXCELLENT: Response time ${duration}ms (< 1 second)`);
      } else if (duration < 5000) {
        console.log(`✅ GOOD: Response time ${duration}ms (< 5 seconds)`);
      } else if (duration < 30000) {
        console.log(`⚠️ SLOW: Response time ${duration}ms (< 30 seconds)`);
      } else {
        console.log(`❌ VERY SLOW: Response time ${duration}ms (> 30 seconds)`);
      }
      
      // Compare with original 1.4 minutes
      const originalTime = 1.4 * 60 * 1000; // 1.4 minutes in ms
      const improvement = ((originalTime - duration) / originalTime) * 100;
      console.log(`📈 Performance improvement: ${improvement.toFixed(1)}% faster than original`);
      
    } else {
      console.log('⚠️ API returned old format - optimization not deployed yet');
    }
    
    // Test 3: Test pagination
    console.log('\n📊 Test 3: Testing pagination...');
    const page2Response = await fetch(`${API_BASE_URL}/api/webhook/inactive-vendors?page=2&limit=10`);
    if (page2Response.ok) {
      const page2Data = await page2Response.json();
      if (page2Data.vendors && page2Data.pagination) {
        console.log(`✅ Pagination working: Page 2 returned ${page2Data.vendors.length} vendors`);
        console.log(`📊 Page 2 info: ${page2Data.pagination.page}/${page2Data.pagination.pages}`);
      }
    }
    
    // Test 4: Test contacts caching (if possible)
    console.log('\n📊 Test 4: Testing contacts endpoint...');
    const contactsResponse = await fetch(`${API_BASE_URL}/api/webhook/contacts`);
    if (contactsResponse.ok) {
      const contactsData = await contactsResponse.json();
      console.log(`✅ Contacts endpoint: ${contactsData.length} contacts returned`);
    }
    
  } catch (error) {
    console.error('❌ Error testing performance improvements:', error);
  }
}

testPerformanceImprovements();
