import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testVendorNames() {
  try {
    console.log('🧪 TESTING VENDOR NAMES IN MESSAGE HEALTH');
    console.log('==========================================');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000';
    console.log(`🌐 Testing message health API at: ${apiBaseUrl}/api/webhook/message-health`);

    // Test the message health API
    const response = await fetch(`${apiBaseUrl}/api/webhook/message-health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Message health API working!`);
      
      console.log(`\n📊 Vendor Update Location Messages: ${data.vendorUpdateLocationLogs?.length || 0}`);
      
      if (data.vendorUpdateLocationLogs && data.vendorUpdateLocationLogs.length > 0) {
        console.log('\n📋 Vendor Update Location Messages:');
        data.vendorUpdateLocationLogs.forEach((log: any, index: number) => {
          console.log(`${index + 1}. Vendor: ${log.vendorName}`);
          console.log(`   Phone: ${log.contactNumber}`);
          console.log(`   Sent: ${new Date(log.sentAt).toLocaleString()}`);
          console.log(`   Minutes Before: ${log.minutesBefore}`);
          console.log(`   Open Time: ${log.openTime}`);
          console.log('');
        });
      } else {
        console.log('❌ No vendor update location messages found');
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Message health API failed: ${errorText}`);
    }

    // Also check the raw messages in the database
    console.log('\n🔍 Checking raw messages in database:');
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    const vendorMessages = await Message.find({
      direction: 'outbound',
      body: { $regex: /HXbdb716843483717790c45c951b71701e/ },
      timestamp: { $gte: fortyEightHoursAgo }
    }).sort({ timestamp: -1 }).limit(10);

    console.log(`Found ${vendorMessages.length} vendor reminder messages:`);
    
    for (const msg of vendorMessages) {
      console.log(`\n📱 Message to: ${msg.to}`);
      console.log(`   Meta:`, JSON.stringify(msg.meta, null, 2));
      console.log(`   Timestamp: ${msg.timestamp}`);
      
      // Try to find the user
      const phone = msg.to.replace('whatsapp:', '');
      const userNumbers = [phone];
      if (phone.startsWith('+91')) userNumbers.push(phone.replace('+91', '91'));
      if (phone.startsWith('+')) userNumbers.push(phone.substring(1));
      userNumbers.push(phone.slice(-10));
      
      const user = await User.findOne({ contactNumber: { $in: userNumbers } });
      if (user) {
        console.log(`   ✅ Found user: ${user.name} (${user.contactNumber})`);
      } else {
        console.log(`   ❌ No user found for phone numbers: ${userNumbers.join(', ')}`);
      }
    }

    // Check if there are any users with the specific phone number from the image
    console.log('\n🔍 Checking for user with phone +919998120234:');
    const testPhone = '+919998120234';
    const testUserNumbers = [testPhone];
    if (testPhone.startsWith('+91')) testUserNumbers.push(testPhone.replace('+91', '91'));
    if (testPhone.startsWith('+')) testUserNumbers.push(testPhone.substring(1));
    testUserNumbers.push(testPhone.slice(-10));
    
    const testUser = await User.findOne({ contactNumber: { $in: testUserNumbers } });
    if (testUser) {
      console.log(`✅ Found user: ${testUser.name} (${testUser.contactNumber})`);
    } else {
      console.log(`❌ No user found for phone: ${testPhone}`);
      console.log(`   Tried variations: ${testUserNumbers.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error testing vendor names:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testVendorNames();
