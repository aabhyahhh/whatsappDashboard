import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test the location update API endpoint
async function testLocationAPI() {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000/api';
    
    console.log('🧪 Testing Location Update API Endpoint');
    console.log('=======================================');
    console.log(`📡 API URL: ${apiUrl}`);
    
    const testData = {
      contactNumber: '+919265466535', // test_vendor phone number
      lat: '23.0210',
      lng: '72.5714',
      mapsLink: 'https://maps.google.com/?q=23.0210,72.5714'
    };

    console.log('\n📤 Testing /api/vendor/update-location-both');
    console.log('Payload:', JSON.stringify(testData, null, 2));

    // Test the new endpoint that updates both models
    const response = await axios.post(`${apiUrl}/vendor/update-location-both`, testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ API Response:');
    console.log(`Status: ${response.status}`);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    // Test with just coordinates
    console.log('\n📤 Testing with just coordinates...');
    const coordOnlyData = {
      contactNumber: '+919265466535',
      lat: '23.0211',
      lng: '72.5715'
    };

    const coordResponse = await axios.post(`${apiUrl}/vendor/update-location-both`, coordOnlyData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Coordinates-only Response:');
    console.log(`Status: ${coordResponse.status}`);
    console.log('Data:', JSON.stringify(coordResponse.data, null, 2));

    // Test with just Google Maps link
    console.log('\n📤 Testing with just Google Maps link...');
    const linkOnlyData = {
      contactNumber: '+919265466535',
      mapsLink: 'https://maps.google.com/?q=23.0212,72.5716'
    };

    const linkResponse = await axios.post(`${apiUrl}/vendor/update-location-both`, linkOnlyData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Link-only Response:');
    console.log(`Status: ${linkResponse.status}`);
    console.log('Data:', JSON.stringify(linkResponse.data, null, 2));

    console.log('\n✅ All API tests completed successfully!');

  } catch (error) {
    console.error('❌ API test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

// Test error cases
async function testErrorCases() {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000/api';
    
    console.log('\n🧪 Testing Error Cases');
    console.log('=====================');

    // Test with missing contact number
    console.log('\n📤 Testing with missing contact number...');
    try {
      await axios.post(`${apiUrl}/vendor/update-location-both`, {
        lat: '23.0210',
        lng: '72.5714'
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log(`✅ Expected error: ${error.response?.status} - ${error.response?.data?.error}`);
      }
    }

    // Test with no location data
    console.log('\n📤 Testing with no location data...');
    try {
      await axios.post(`${apiUrl}/vendor/update-location-both`, {
        contactNumber: '+919265466535'
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log(`✅ Expected error: ${error.response?.status} - ${error.response?.data?.error}`);
      }
    }

    // Test with invalid phone number
    console.log('\n📤 Testing with invalid phone number...');
    try {
      await axios.post(`${apiUrl}/vendor/update-location-both`, {
        contactNumber: '+999999999999',
        lat: '23.0210',
        lng: '72.5714'
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log(`✅ Expected error: ${error.response?.status} - ${error.response?.data?.error}`);
      }
    }

    console.log('\n✅ Error case tests completed!');

  } catch (error) {
    console.error('❌ Error case test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  await testLocationAPI();
  await testErrorCases();
}

runAllTests();
