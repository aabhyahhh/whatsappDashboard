import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testLocationUpdate() {
  try {
    console.log('🧪 TESTING LOCATION UPDATE IN DATABASE');
    console.log('=====================================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');
    
    // Check the specific user that sent the location
    const phoneNumber = '+918130026321';
    const userNumbers = [phoneNumber];
    if (phoneNumber.startsWith('+91')) userNumbers.push(phoneNumber.replace('+91', '91'));
    if (phoneNumber.startsWith('+')) userNumbers.push(phoneNumber.substring(1));
    userNumbers.push(phoneNumber.slice(-10));
    
    console.log(`🔍 Looking for user with phone: ${phoneNumber}`);
    console.log(`📱 Trying variations: ${userNumbers.join(', ')}`);
    
    const user = await User.findOne({ contactNumber: { $in: userNumbers } });
    
    if (user) {
      console.log(`✅ Found user: ${user.name} (${user.contactNumber})`);
      console.log(`📍 Location data:`);
      console.log(`   - Has location: ${!!user.location}`);
      console.log(`   - Location type: ${user.location?.type || 'N/A'}`);
      console.log(`   - Coordinates: ${user.location?.coordinates ? `[${user.location.coordinates.join(', ')}]` : 'N/A'}`);
      console.log(`   - Maps Link: ${user.mapsLink || 'N/A'}`);
      console.log(`   - Updated At: ${user.updatedAt || 'N/A'}`);
      
      if (user.location?.coordinates) {
        const [lng, lat] = user.location.coordinates;
        console.log(`🌐 Google Maps URL: https://maps.google.com/?q=${lat},${lng}`);
        console.log(`📍 Expected coordinates from logs: 28.498142242432, 76.983039855957`);
        console.log(`📍 Database coordinates: ${lat}, ${lng}`);
        
        if (Math.abs(lat - 28.498142242432) < 0.000001 && Math.abs(lng - 76.983039855957) < 0.000001) {
          console.log('✅ Location coordinates match the webhook logs!');
        } else {
          console.log('❌ Location coordinates do not match the webhook logs');
        }
      } else {
        console.log('❌ No location data found in database');
      }
    } else {
      console.log(`❌ No user found with phone number: ${phoneNumber}`);
      
      // Check if there are any users with similar phone numbers
      const similarUsers = await User.find({
        contactNumber: { $regex: phoneNumber.slice(-10) }
      });
      
      if (similarUsers.length > 0) {
        console.log(`📋 Found ${similarUsers.length} users with similar phone numbers:`);
        similarUsers.forEach(u => {
          console.log(`   - ${u.name} (${u.contactNumber})`);
        });
      }
    }
    
    // Also check recent location updates
    console.log('\n🔍 Checking recent location updates...');
    const recentUsers = await User.find({
      'location.coordinates': { $exists: true, $ne: [0, 0] },
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ updatedAt: -1 }).limit(5);
    
    console.log(`📊 Found ${recentUsers.length} users with recent location updates:`);
    recentUsers.forEach(u => {
      const [lng, lat] = u.location.coordinates;
      console.log(`   - ${u.name} (${u.contactNumber}): ${lat}, ${lng} - Updated: ${u.updatedAt}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing location update:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testLocationUpdate();
