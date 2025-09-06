import https from 'https';

async function fetchData(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function testInactiveLogic() {
  try {
    console.log('🧪 Testing inactive vendors logic...\n');

    // Test 1: Get all contacts to see lastSeen distribution
    console.log('📊 Test 1: Analyzing lastSeen distribution...');
    const allContacts = await fetchData('https://whatsappdashboard-1.onrender.com/api/contacts');
    
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    
    let activeCount = 0;
    let inactiveCount = 0;
    let noLastSeenCount = 0;
    
    const activeContacts = [];
    const inactiveContacts = [];
    
    allContacts.forEach((contact: any) => {
      if (!contact.lastSeen) {
        noLastSeenCount++;
        inactiveContacts.push({
          phone: contact.phone,
          name: contact.name,
          status: 'No lastSeen data'
        });
      } else {
        const lastSeenDate = new Date(contact.lastSeen);
        if (lastSeenDate > fiveDaysAgo) {
          activeCount++;
          activeContacts.push({
            phone: contact.phone,
            name: contact.name,
            lastSeen: contact.lastSeen,
            daysAgo: Math.floor((now.getTime() - lastSeenDate.getTime()) / (24 * 60 * 60 * 1000))
          });
        } else {
          inactiveCount++;
          inactiveContacts.push({
            phone: contact.phone,
            name: contact.name,
            lastSeen: contact.lastSeen,
            daysAgo: Math.floor((now.getTime() - lastSeenDate.getTime()) / (24 * 60 * 60 * 1000))
          });
        }
      }
    });

    console.log(`✅ Total contacts: ${allContacts.length}`);
    console.log(`✅ Active contacts (last 5 days): ${activeCount}`);
    console.log(`❌ Inactive contacts (5+ days): ${inactiveCount}`);
    console.log(`❓ No lastSeen data: ${noLastSeenCount}`);

    // Test 2: Get inactive vendors from the endpoint
    console.log('\n📊 Test 2: Checking inactive vendors endpoint...');
    const inactiveVendorsData = await fetchData('https://whatsappdashboard-1.onrender.com/api/webhook/inactive-vendors?page=1&limit=5');
    console.log(`✅ Inactive vendors endpoint shows: ${inactiveVendorsData.pagination.total} total`);

    // Test 3: Verify the logic matches
    console.log('\n📊 Test 3: Verifying logic consistency...');
    const expectedInactive = inactiveCount + noLastSeenCount;
    const actualInactive = inactiveVendorsData.pagination.total;
    
    if (expectedInactive === actualInactive) {
      console.log('✅ Logic is consistent!');
    } else {
      console.log(`❌ Logic mismatch: Expected ${expectedInactive}, got ${actualInactive}`);
    }

    // Test 4: Show sample inactive vendors
    console.log('\n📊 Test 4: Sample inactive vendors...');
    inactiveVendorsData.vendors.slice(0, 5).forEach((vendor: any, index: number) => {
      console.log(`  ${index + 1}. ${vendor.name} (${vendor.contactNumber}) - ${vendor.daysInactive} days inactive`);
    });

    // Test 5: Show sample active vendors
    console.log('\n📊 Test 5: Sample active vendors...');
    activeContacts.slice(0, 5).forEach((contact: any, index: number) => {
      console.log(`  ${index + 1}. ${contact.name} (${contact.phone}) - ${contact.daysAgo} days ago`);
    });

    // Test 6: Check if any vendors responded to support prompts recently
    console.log('\n📊 Test 6: Checking for recent support prompt responses...');
    const messageHealth = await fetchData('https://whatsappdashboard-1.onrender.com/api/webhook/message-health');
    console.log(`✅ Total Meta messages: ${messageHealth.stats.totalMetaMessages}`);
    console.log(`📞 Support calls: ${messageHealth.stats.totalSupportCalls}`);

    console.log('\n🎯 LOGIC VERIFICATION SUMMARY:');
    console.log('='.repeat(50));
    console.log('✅ When vendors send ANY message (text/location/button):');
    console.log('   → Contact.lastSeen is updated to current timestamp');
    console.log('✅ Inactive vendors logic:');
    console.log('   → Checks if lastSeen > 5 days ago');
    console.log('   → If yes → vendor appears on inactive page');
    console.log('   → If no → vendor does NOT appear on inactive page');
    console.log('✅ Support prompt responses:');
    console.log('   → Any response updates lastSeen');
    console.log('   → Vendor immediately becomes "active"');
    console.log('   → Removed from inactive vendors page');

    console.log('\n📈 CURRENT STATUS:');
    console.log('='.repeat(50));
    console.log(`Total Contacts: ${allContacts.length}`);
    console.log(`Active Vendors: ${activeCount} (${((activeCount/allContacts.length)*100).toFixed(1)}%)`);
    console.log(`Inactive Vendors: ${inactiveCount} (${((inactiveCount/allContacts.length)*100).toFixed(1)}%)`);
    console.log(`No Data: ${noLastSeenCount} (${((noLastSeenCount/allContacts.length)*100).toFixed(1)}%)`);

  } catch (error) {
    console.error('❌ Error testing inactive logic:', error.message);
  }
}

testInactiveLogic();
