import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testWebhookLocationEndpoint() {
  try {
    console.log('🧪 TESTING WEBHOOK LOCATION ENDPOINT');
    console.log('=====================================');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000';
    console.log(`🌐 Testing webhook at: ${apiBaseUrl}/api/webhook`);

    // Test different location message formats
    const testCases = [
      {
        name: 'Twilio Native Location',
        payload: {
          From: 'whatsapp:+919876543210',
          To: 'whatsapp:+919876543211',
          Latitude: '19.0760',
          Longitude: '72.8777',
          Address: 'Mumbai, Maharashtra, India',
          Label: 'Current Location'
        }
      },
      {
        name: 'Text-based Location',
        payload: {
          From: 'whatsapp:+919876543210',
          To: 'whatsapp:+919876543211',
          Body: 'Location: 19.0760, 72.8777'
        }
      },
      {
        name: 'Google Maps Link',
        payload: {
          From: 'whatsapp:+919876543210',
          To: 'whatsapp:+919876543211',
          Body: 'Check out this location: https://maps.google.com/?q=28.6139,77.2090'
        }
      },
      {
        name: 'Coordinates Only',
        payload: {
          From: 'whatsapp:+919876543210',
          To: 'whatsapp:+919876543211',
          Body: '19.0760, 72.8777'
        }
      }
    ];

    console.log('\n🧪 Testing webhook endpoint with different location formats:');
    console.log('============================================================');

    for (const testCase of testCases) {
      console.log(`\n📝 Testing: ${testCase.name}`);
      console.log(`   Payload:`, JSON.stringify(testCase.payload, null, 2));

      try {
        const response = await fetch(`${apiBaseUrl}/api/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testCase.payload),
        });

        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
          console.log(`   ✅ Webhook processed successfully`);
          
          // Check if message was saved
          const phone = testCase.payload.From.replace('whatsapp:', '');
          const userNumbers = [phone];
          if (phone.startsWith('+91')) userNumbers.push(phone.replace('+91', '91'));
          if (phone.startsWith('+')) userNumbers.push(phone.substring(1));
          userNumbers.push(phone.slice(-10));

          const recentMessages = await Message.find({
            from: testCase.payload.From,
            timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
          }).sort({ timestamp: -1 }).limit(1);

          if (recentMessages.length > 0) {
            const message = recentMessages[0];
            console.log(`   📝 Message saved: ${message.body}`);
            if (message.location) {
              console.log(`   📍 Location: ${message.location.latitude}, ${message.location.longitude}`);
            } else {
              console.log(`   ❌ No location in saved message`);
            }
          } else {
            console.log(`   ❌ No recent message found`);
          }

          // Check if user location was updated
          const users = await User.find({ contactNumber: { $in: userNumbers } });
          if (users.length > 0) {
            const user = users[0];
            if (user.location && user.location.coordinates) {
              console.log(`   👤 User location updated: ${user.location.coordinates[1]}, ${user.location.coordinates[0]}`);
              console.log(`   🗺️  Maps link: ${user.mapsLink || 'N/A'}`);
            } else {
              console.log(`   ❌ User location not updated`);
            }
          } else {
            console.log(`   ❌ No user found with phone number`);
          }

        } else {
          const errorText = await response.text();
          console.log(`   ❌ Webhook failed: ${errorText}`);
        }
      } catch (error) {
        console.log(`   ❌ Request failed: ${error}`);
      }
    }

    // Check recent location messages in database
    console.log('\n📊 Recent location messages in database:');
    console.log('=========================================');

    const recentLocationMessages = await Message.find({
      location: { $exists: true },
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ timestamp: -1 }).limit(10);

    console.log(`Found ${recentLocationMessages.length} location messages in the last 24 hours:`);

    recentLocationMessages.forEach((msg, index) => {
      console.log(`\n${index + 1}. From: ${msg.from}`);
      console.log(`   Body: "${msg.body}"`);
      console.log(`   Location: ${msg.location?.latitude}, ${msg.location?.longitude}`);
      console.log(`   Address: ${msg.address || 'N/A'}`);
      console.log(`   Timestamp: ${msg.timestamp}`);
    });

    // Check users with updated locations
    console.log('\n👥 Users with updated locations:');
    console.log('=================================');

    const usersWithLocation = await User.find({
      'location.coordinates': { $exists: true, $ne: [0, 0] }
    }).sort({ updatedAt: -1 }).limit(10);

    console.log(`Found ${usersWithLocation.length} users with location data:`);

    usersWithLocation.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name} (${user.contactNumber})`);
      console.log(`   Location: ${user.location.coordinates[1]}, ${user.location.coordinates[0]}`);
      console.log(`   Maps Link: ${user.mapsLink || 'N/A'}`);
      console.log(`   Last Updated: ${user.updatedAt}`);
    });

    console.log('\n✅ Webhook location endpoint test completed!');

  } catch (error) {
    console.error('❌ Error testing webhook location endpoint:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testWebhookLocationEndpoint();
