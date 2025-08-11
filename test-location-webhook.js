import fetch from 'node-fetch';

async function testLocationWebhook() {
    const testData = {
        From: 'whatsapp:+919876543210',
        To: 'whatsapp:+15557897194',
        Latitude: '28.6139',
        Longitude: '77.2090',
        Address: 'New Delhi, India',
        Label: 'Test Location'
    };

    try {
        console.log('🧪 Testing location webhook...');
        console.log('📤 Sending test data:', testData);
        
        const response = await fetch('http://localhost:5000/api/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response body:', await response.text());
        
        if (response.ok) {
            console.log('✅ Webhook test successful!');
        } else {
            console.log('❌ Webhook test failed!');
        }
    } catch (error) {
        console.error('❌ Error testing webhook:', error.message);
    }
}

// Test with Google Maps link
async function testGoogleMapsWebhook() {
    const testData = {
        From: 'whatsapp:+919876543210',
        To: 'whatsapp:+15557897194',
        Body: 'Check out this location: https://maps.google.com/?q=28.6139,77.2090'
    };

    try {
        console.log('\n🧪 Testing Google Maps webhook...');
        console.log('📤 Sending test data:', testData);
        
        const response = await fetch('http://localhost:5000/api/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response body:', await response.text());
        
        if (response.ok) {
            console.log('✅ Google Maps webhook test successful!');
        } else {
            console.log('❌ Google Maps webhook test failed!');
        }
    } catch (error) {
        console.error('❌ Error testing Google Maps webhook:', error.message);
    }
}

// Run tests
async function runTests() {
    await testLocationWebhook();
    await testGoogleMapsWebhook();
}

runTests();
