// Quick performance test script
const apiBaseUrl = 'https://whatsappdashboard-1.onrender.com';

async function testPerformance() {
    console.log('🧪 Testing API Performance...');
    
    // Test login endpoint
    const loginStart = Date.now();
    try {
        const response = await fetch(`${apiBaseUrl}/api/health`);
        const data = await response.json();
        const loginTime = Date.now() - loginStart;
        console.log(`✅ Health check: ${loginTime}ms`);
    } catch (error) {
        console.log(`❌ Health check failed: ${error.message}`);
    }
    
    // Test contacts endpoint
    const contactsStart = Date.now();
    try {
        const response = await fetch(`${apiBaseUrl}/api/contacts`);
        const data = await response.json();
        const contactsTime = Date.now() - contactsStart;
        console.log(`✅ Contacts API: ${contactsTime}ms (${data.length} contacts)`);
    } catch (error) {
        console.log(`❌ Contacts API failed: ${error.message}`);
    }
}

testPerformance();
