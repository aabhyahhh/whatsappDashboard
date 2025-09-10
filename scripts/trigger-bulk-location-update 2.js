// Simple script to trigger bulk location update via existing endpoints
// This can be run directly on the production server

import https from 'https';

const options = {
  hostname: 'whatsappdashboard-1.onrender.com',
  port: 443,
  path: '/api/webhook/send-location-update-to-all',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🚀 Triggering bulk location update to all users...');
console.log('📡 Calling: https://whatsappdashboard-1.onrender.com/api/webhook/send-location-update-to-all');

const req = https.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅ Response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log(`\n🎉 SUCCESS!`);
        console.log(`✅ Messages sent: ${response.sentCount}`);
        console.log(`❌ Messages failed: ${response.errorCount}`);
        console.log(`📊 Total users: ${response.totalUsers}`);
      } else {
        console.log(`\n❌ FAILED: ${response.error}`);
      }
    } catch (error) {
      console.log('📄 Raw response:', data);
      console.log('❌ Error parsing response:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.end();
