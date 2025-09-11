// Quick verification script for production fixes
const API_BASE_URL = 'https://whatsappdashboard-1.onrender.com';

async function verifyFixes() {
    console.log('🧪 Verifying production fixes...');
    
    // Test 1: CORS headers
    console.log('\n1️⃣ Testing CORS configuration...');
    try {
        const corsResponse = await fetch(`${API_BASE_URL}/api/contacts`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://whatsappdashboard-1.onrender.com',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type, Pragma, Cache-Control'
            }
        });
        console.log(`   CORS Status: ${corsResponse.status}`);
        if (corsResponse.status === 200) {
            console.log('   ✅ CORS configuration is working');
        } else {
            console.log('   ❌ CORS configuration needs update');
        }
    } catch (error) {
        console.log('   ❌ CORS test failed:', error.message);
    }
    
    // Test 2: Contacts API
    console.log('\n2️⃣ Testing contacts API...');
    try {
        const contactsResponse = await fetch(`${API_BASE_URL}/api/contacts`);
        console.log(`   Contacts Status: ${contactsResponse.status}`);
        if (contactsResponse.ok) {
            const data = await contactsResponse.json();
            console.log(`   ✅ Contacts API working - ${data.length} contacts`);
        } else {
            console.log('   ❌ Contacts API failed');
        }
    } catch (error) {
        console.log('   ❌ Contacts test failed:', error.message);
    }
    
    // Test 3: Inactive vendors
    console.log('\n3️⃣ Testing inactive vendors...');
    try {
        const inactiveResponse = await fetch(`${API_BASE_URL}/api/webhook/inactive-vendors?page=1&limit=5`);
        console.log(`   Inactive Status: ${inactiveResponse.status}`);
        if (inactiveResponse.ok) {
            const data = await inactiveResponse.json();
            console.log(`   ✅ Inactive vendors working - ${data.vendors?.length || 0} vendors`);
        } else {
            console.log('   ❌ Inactive vendors failed');
        }
    } catch (error) {
        console.log('   ❌ Inactive vendors test failed:', error.message);
    }
    
    // Test 4: Health endpoint
    console.log('\n4️⃣ Testing health endpoint...');
    try {
        const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
        console.log(`   Health Status: ${healthResponse.status}`);
        if (healthResponse.ok) {
            const data = await healthResponse.json();
            console.log(`   ✅ Health endpoint working - ${data.status}`);
        } else {
            console.log('   ❌ Health endpoint failed');
        }
    } catch (error) {
        console.log('   ❌ Health test failed:', error.message);
    }
    
    console.log('\n🎯 Verification complete!');
}

verifyFixes();
