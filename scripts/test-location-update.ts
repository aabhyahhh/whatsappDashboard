import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import VendorLocation from '../server/models/VendorLocation.js';

// Test location update functionality
async function testLocationUpdate() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-dashboard';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const testPhone = '+919265466535'; // Using the phone from your example
    const testLocation = {
      latitude: 23.0210,
      longitude: 72.5714
    };

    console.log(`🧪 Testing location update for phone: ${testPhone}`);
    console.log(`📍 Test coordinates: ${testLocation.latitude}, ${testLocation.longitude}`);

    // 1. Test User model update
    console.log('\n📋 Testing User model update...');
    const users = await User.find({ contactNumber: testPhone });
    console.log(`Found ${users.length} users with phone ${testPhone}`);

    for (const user of users) {
      console.log(`Updating user: ${user.name}`);
      user.location = {
        type: 'Point',
        coordinates: [testLocation.longitude, testLocation.latitude],
      };
      user.mapsLink = `https://maps.google.com/?q=${testLocation.latitude},${testLocation.longitude}`;
      await user.save();
      console.log(`✅ Updated user location for ${user.contactNumber}`);
    }

    // 2. Test VendorLocation model update
    console.log('\n📋 Testing VendorLocation model update...');
    let vendorLocation = await VendorLocation.findOne({ phone: testPhone });
    
    if (vendorLocation) {
      console.log('Found existing VendorLocation record, updating...');
      vendorLocation.location = {
        lat: testLocation.latitude,
        lng: testLocation.longitude
      };
      vendorLocation.updatedAt = new Date();
      await vendorLocation.save();
      console.log(`✅ Updated VendorLocation for ${testPhone}`);
    } else {
      console.log('Creating new VendorLocation record...');
      vendorLocation = new VendorLocation({
        phone: testPhone,
        location: {
          lat: testLocation.latitude,
          lng: testLocation.longitude
        }
      });
      await vendorLocation.save();
      console.log(`✅ Created new VendorLocation for ${testPhone}`);
    }

    // 3. Verify the updates
    console.log('\n🔍 Verifying updates...');
    
    // Check User model
    const updatedUsers = await User.find({ contactNumber: testPhone });
    for (const user of updatedUsers) {
      console.log(`User ${user.name}:`);
      console.log(`  - Location: ${JSON.stringify(user.location)}`);
      console.log(`  - Maps Link: ${user.mapsLink}`);
    }

    // Check VendorLocation model
    const updatedVendorLocation = await VendorLocation.findOne({ phone: testPhone });
    if (updatedVendorLocation) {
      console.log(`VendorLocation:`);
      console.log(`  - Phone: ${updatedVendorLocation.phone}`);
      console.log(`  - Location: ${JSON.stringify(updatedVendorLocation.location)}`);
      console.log(`  - Updated At: ${updatedVendorLocation.updatedAt}`);
    }

    console.log('\n✅ Location update test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testLocationUpdate();
