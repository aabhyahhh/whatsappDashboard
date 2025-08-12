import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import VendorLocation from '../server/models/VendorLocation.js';

// Test data
const testPhone = '+919876543210';
const testLocation = {
  latitude: 28.6139,
  longitude: 77.2090
};

async function testLocationUpdate() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-dashboard');
    console.log('✅ Connected to database');

    // Create a test user if it doesn't exist
    let testUser = await User.findOne({ contactNumber: testPhone });
    if (!testUser) {
      testUser = new User({
        name: 'Test Vendor',
        email: 'test@example.com',
        password: 'testpassword',
        contactNumber: testPhone,
        mapsLink: 'https://maps.google.com/?q=28.6139,77.2090',
        operatingHours: {
          openTime: '09:00',
          closeTime: '18:00',
          days: [1, 2, 3, 4, 5, 6, 7]
        }
      });
      await testUser.save();
      console.log('✅ Created test user');
    } else {
      console.log('✅ Test user already exists');
    }

    // Test location update in User model
    testUser.location = {
      type: 'Point',
      coordinates: [testLocation.longitude, testLocation.latitude]
    };
    testUser.mapsLink = `https://maps.google.com/?q=${testLocation.latitude},${testLocation.longitude}`;
    await testUser.save();
    console.log('✅ Updated user location');

    // Test location update in VendorLocation model
    await VendorLocation.findOneAndUpdate(
      { phone: testPhone },
      {
        phone: testPhone,
        location: {
          lat: testLocation.latitude,
          lng: testLocation.longitude
        },
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    console.log('✅ Updated VendorLocation');

    // Verify the updates
    const updatedUser = await User.findOne({ contactNumber: testPhone });
    const updatedVendorLocation = await VendorLocation.findOne({ phone: testPhone });

    console.log('\n📊 Verification Results:');
    console.log('User location:', updatedUser?.location);
    console.log('User mapsLink:', updatedUser?.mapsLink);
    console.log('VendorLocation:', updatedVendorLocation?.location);
    console.log('VendorLocation updatedAt:', updatedVendorLocation?.updatedAt);

    // Test with different phone number formats
    const phoneVariations = [
      testPhone,
      testPhone.replace('+91', '91'),
      testPhone.substring(1),
      testPhone.slice(-10)
    ];

    console.log('\n📱 Phone number variations:', phoneVariations);

    // Test finding user with different phone formats
    const users = await User.find({ contactNumber: { $in: phoneVariations } });
    console.log('Users found with phone variations:', users.length);

    console.log('\n✅ Location update test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the test
testLocationUpdate();
