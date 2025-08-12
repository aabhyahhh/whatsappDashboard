import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testActualDatabaseStructure() {
  try {
    console.log('🧪 TESTING ACTUAL DATABASE STRUCTURE');
    console.log('====================================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');
    
    // Check the specific user that sent the location
    const phoneNumber = '+918130026321';
    const userNumbers = [phoneNumber];
    if (phoneNumber.startsWith('+91')) userNumbers.push(phoneNumber.replace('+91', '91'));
    if (phoneNumber.startsWith('+')) userNumbers.push(phoneNumber.substring(1));
    userNumbers.push(phoneNumber.slice(-10));
    
    console.log(`🔍 Checking users collection for: ${phoneNumber}`);
    const user = await User.findOne({ contactNumber: { $in: userNumbers } });
    
    if (user) {
      console.log(`✅ Found vendor in users collection: ${user.name} (${user.contactNumber})`);
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
      console.log(`❌ No vendor found with phone number: ${phoneNumber}`);
    }
    
    // Check all vendors with recent location updates
    console.log(`\n🔍 Checking all vendors with recent location updates...`);
    const recentVendors = await User.find({
      'location.coordinates': { $exists: true, $ne: [0, 0] },
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ updatedAt: -1 }).limit(10);
    
    console.log(`📊 Found ${recentVendors.length} vendors with recent location updates:`);
    recentVendors.forEach(v => {
      const [lng, lat] = v.location.coordinates;
      console.log(`   - ${v.name} (${v.contactNumber}): ${lat}, ${lng} - Updated: ${v.updatedAt}`);
    });
    
    // Check if Laari Khojo map would see these coordinates
    console.log(`\n🔍 Checking coordinates for Laari Khojo map integration:`);
    const allVendorsWithLocation = await User.find({
      'location.coordinates': { $exists: true, $ne: [0, 0] }
    }).select('name contactNumber location.coordinates mapsLink updatedAt');
    
    console.log(`📊 Total vendors with location data: ${allVendorsWithLocation.length}`);
    
    if (allVendorsWithLocation.length > 0) {
      console.log(`📍 Sample coordinates for Laari Khojo map:`);
      allVendorsWithLocation.slice(0, 5).forEach(v => {
        const [lng, lat] = v.location.coordinates;
        console.log(`   - ${v.name}: ${lat}, ${lng} (${v.mapsLink})`);
      });
    }
    
    // Check if there's a separate vendors collection (should be empty or not exist)
    console.log(`\n🔍 Checking if separate vendors collection exists...`);
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const vendorCollection = collections.find(col => col.name === 'vendors');
      
      if (vendorCollection) {
        console.log(`⚠️  Found separate 'vendors' collection - this should not be used`);
        const vendorCount = await mongoose.connection.db.collection('vendors').countDocuments();
        console.log(`   - Documents in vendors collection: ${vendorCount}`);
      } else {
        console.log(`✅ No separate 'vendors' collection found - correct structure`);
      }
    } catch (error) {
      console.log(`✅ No separate 'vendors' collection found - correct structure`);
    }
    
  } catch (error) {
    console.error('❌ Error testing database structure:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testActualDatabaseStructure();
