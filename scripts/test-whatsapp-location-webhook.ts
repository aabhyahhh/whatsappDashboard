import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test WhatsApp location webhook
async function testWhatsAppLocationWebhook() {
  try {
    const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook';
    
    console.log('🧪 Testing WhatsApp Location Webhook');
    console.log('=====================================');
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    
    // Simulate WhatsApp location message payload
    const locationPayload = {
      From: 'whatsapp:+919265466535', // test_vendor phone number
      To: 'whatsapp:+1234567890', // Twilio number
      Body: '📍 Location shared', // Optional body
      Latitude: '23.0210', // Test coordinates
      Longitude: '72.5714',
      Address: 'Ahmedabad, Gujarat, India',
      Label: 'Test Location',
      ButtonPayload: null
    };

    console.log('\n📤 Sending location payload:');
    console.log(JSON.stringify(locationPayload, null, 2));

    // Send POST request to webhook
    const response = await axios.post(webhookUrl, locationPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('\n✅ Webhook response:');
    console.log(`Status: ${response.status}`);
    console.log(`Data: ${JSON.stringify(response.data, null, 2)}`);

    // Wait a moment for database operations to complete
    console.log('\n⏳ Waiting for database operations...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✅ Location webhook test completed!');
    console.log('📋 Check the database to verify location updates in both User and VendorLocation collections.');

  } catch (error) {
    console.error('❌ Webhook test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

// Test with Google Maps link instead of coordinates
async function testGoogleMapsLinkWebhook() {
  try {
    const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook';
    
    console.log('\n🧪 Testing Google Maps Link Webhook');
    console.log('=====================================');
    
    // Simulate WhatsApp message with Google Maps link
    const mapsLinkPayload = {
      From: 'whatsapp:+919265466535',
      To: 'whatsapp:+1234567890',
      Body: '📍 My location: https://maps.google.com/?q=23.0210,72.5714',
      ButtonPayload: null
    };

    console.log('\n📤 Sending Google Maps link payload:');
    console.log(JSON.stringify(mapsLinkPayload, null, 2));

    const response = await axios.post(webhookUrl, mapsLinkPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('\n✅ Google Maps link webhook response:');
    console.log(`Status: ${response.status}`);
    console.log(`Data: ${JSON.stringify(response.data, null, 2)}`);

    console.log('\n✅ Google Maps link webhook test completed!');

  } catch (error) {
    console.error('❌ Google Maps link webhook test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

// Run both tests
async function runAllTests() {
  await testWhatsAppLocationWebhook();
  await testGoogleMapsLinkWebhook();
}

runAllTests();
