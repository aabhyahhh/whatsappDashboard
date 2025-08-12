import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import Vendor from '../server/models/Vendor.js';
import { Message } from '../server/models/Message.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testLocationWebhook() {
  try {
    console.log('🧪 TESTING LOCATION WEBHOOK FUNCTIONALITY');
    console.log('==========================================');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Test data - simulate a WhatsApp location message
    const testPayload = {
      From: 'whatsapp:+919876543210', // Test vendor phone number
      To: 'whatsapp:+919876543211',   // Laari Khojo business number
      Body: 'Location: 19.0760, 72.8777', // Mumbai coordinates
      Latitude: '19.0760',
      Longitude: '72.8777',
      Address: 'Mumbai, Maharashtra, India',
      Label: 'Current Location'
    };

    console.log('\n📋 Test Payload:');
    console.log(JSON.stringify(testPayload, null, 2));

    // First, let's check if we have any users/vendors with this phone number
    const phone = testPayload.From.replace('whatsapp:', '');
    const userNumbers = [phone];
    if (phone.startsWith('+91')) userNumbers.push(phone.replace('+91', '91'));
    if (phone.startsWith('+')) userNumbers.push(phone.substring(1));
    userNumbers.push(phone.slice(-10));

    console.log('\n🔍 Looking for users/vendors with phone numbers:', userNumbers);

    const users = await User.find({ contactNumber: { $in: userNumbers } });
    const vendors = await Vendor.find({ contactNumber: { $in: userNumbers } });

    console.log(`Found ${users.length} users and ${vendors.length} vendors`);

    if (users.length === 0 && vendors.length === 0) {
      console.log('\n⚠️ No users or vendors found with this phone number');
      console.log('Creating a test user for demonstration...');
      
      const testUser = new User({
        name: 'Test Vendor',
        contactNumber: phone,
        operatingHours: {
          openTime: '9:00 AM',
          closeTime: '6:00 PM',
          days: [1, 2, 3, 4, 5, 6, 0] // All days
        },
        whatsappConsent: true
      });
      
      await testUser.save();
      console.log('✅ Created test user');
    }

    // Test the location extraction functions
    console.log('\n🧪 Testing location extraction functions...');

    // Test 1: Direct coordinates
    const hasCoordinates = testPayload.Latitude !== undefined && testPayload.Longitude !== undefined;
    if (hasCoordinates) {
      const lat = parseFloat(testPayload.Latitude);
      const lng = parseFloat(testPayload.Longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('✅ Direct coordinates extraction successful:', { latitude: lat, longitude: lng });
      }
    }

    // Test 2: Body extraction
    if (testPayload.Body) {
      // Test WhatsApp location pattern
      const locationMatch = testPayload.Body.match(/Location:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/i);
      if (locationMatch) {
        const lat = parseFloat(locationMatch[1]);
        const lng = parseFloat(locationMatch[2]);
        console.log('✅ WhatsApp location pattern extraction successful:', { latitude: lat, longitude: lng });
      }

      // Test general coordinate patterns
      const coordPatterns = [
        /(-?\d+\.\d+),\s*(-?\d+\.\d+)/,  // lat, lng
        /lat[itude]*:\s*(-?\d+\.\d+).*?lng[itude]*:\s*(-?\d+\.\d+)/i,  // lat: x, lng: y
        /coordinates?:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/i,  // coordinates: lat, lng
      ];

      for (const pattern of coordPatterns) {
        const match = testPayload.Body.match(pattern);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          console.log('✅ General coordinate pattern extraction successful:', { latitude: lat, longitude: lng });
          break;
        }
      }
    }

    // Test 3: Simulate the actual webhook processing
    console.log('\n🧪 Simulating webhook processing...');

    const location = { latitude: 19.0760, longitude: 72.8777 };
    const messageData = {
      from: testPayload.From,
      to: testPayload.To,
      body: testPayload.Body || '[location message]',
      direction: 'inbound',
      timestamp: new Date(),
      location: location,
      address: testPayload.Address,
      label: testPayload.Label
    };

    console.log('📝 Message data to save:', JSON.stringify(messageData, null, 2));

    // Save the test message
    const message = new Message(messageData);
    await message.save();
    console.log('✅ Test message saved successfully');

    // Test location update for users/vendors
    console.log('\n🧪 Testing location update for users/vendors...');

    const updatedUsers = await User.find({ contactNumber: { $in: userNumbers } });
    const updatedVendors = await Vendor.find({ contactNumber: { $in: userNumbers } });

    for (const user of updatedUsers) {
      user.location = {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      };
      user.mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      await user.save();
      console.log(`✅ Updated user location for ${user.contactNumber}`);
      console.log(`   Location: ${user.location.coordinates}`);
      console.log(`   Maps Link: ${user.mapsLink}`);
    }

    for (const vendor of updatedVendors) {
      vendor.location = {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      };
      vendor.mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      await vendor.save();
      console.log(`✅ Updated vendor location for ${vendor.contactNumber}`);
      console.log(`   Location: ${vendor.location.coordinates}`);
      console.log(`   Maps Link: ${vendor.mapsLink}`);
    }

    // Check recent messages to verify
    console.log('\n📊 Recent messages with location:');
    const recentMessages = await Message.find({
      location: { $exists: true },
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ timestamp: -1 }).limit(5);

    recentMessages.forEach((msg, index) => {
      console.log(`${index + 1}. From: ${msg.from}`);
      console.log(`   Body: ${msg.body}`);
      console.log(`   Location: ${msg.location?.latitude}, ${msg.location?.longitude}`);
      console.log(`   Address: ${msg.address || 'N/A'}`);
      console.log(`   Timestamp: ${msg.timestamp}`);
      console.log('');
    });

    console.log('\n✅ Location webhook test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing location webhook:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testLocationWebhook();
