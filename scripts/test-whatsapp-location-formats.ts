import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Helper function to extract coordinates from WhatsApp location sharing
function extractCoordinatesFromWhatsAppLocation(body: string): { latitude: number; longitude: number } | null {
    try {
        // WhatsApp location sharing typically includes coordinates in the message body
        // Look for patterns like "Location: lat, lng" or similar
        const locationMatch = body.match(/Location:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/i);
        if (locationMatch) {
            const lat = parseFloat(locationMatch[1]);
            const lng = parseFloat(locationMatch[2]);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { latitude: lat, longitude: lng };
            }
        }

        // Look for coordinates in various formats
        const coordPatterns = [
            /(-?\d+\.\d+),\s*(-?\d+\.\d+)/,  // lat, lng
            /lat[itude]*:\s*(-?\d+\.\d+).*?lng[itude]*:\s*(-?\d+\.\d+)/i,  // lat: x, lng: y
            /coordinates?:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/i,  // coordinates: lat, lng
        ];

        for (const pattern of coordPatterns) {
            const match = body.match(pattern);
            if (match) {
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { latitude: lat, longitude: lng };
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Error extracting coordinates from WhatsApp location:', (error as Error)?.message);
        return null;
    }
}

async function testWhatsAppLocationFormats() {
  try {
    console.log('🧪 TESTING WHATSAPP LOCATION MESSAGE FORMATS');
    console.log('=============================================');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Test different WhatsApp location message formats
    const testCases = [
      {
        name: 'Standard WhatsApp Location',
        body: 'Location: 19.0760, 72.8777',
        expected: { latitude: 19.0760, longitude: 72.8777 }
      },
      {
        name: 'Coordinates only',
        body: '19.0760, 72.8777',
        expected: { latitude: 19.0760, longitude: 72.8777 }
      },
      {
        name: 'Latitude/Longitude format',
        body: 'latitude: 19.0760, longitude: 72.8777',
        expected: { latitude: 19.0760, longitude: 72.8777 }
      },
      {
        name: 'Coordinates format',
        body: 'coordinates: 19.0760, 72.8777',
        expected: { latitude: 19.0760, longitude: 72.8777 }
      },
      {
        name: 'With extra text',
        body: 'My current location is 19.0760, 72.8777 in Mumbai',
        expected: { latitude: 19.0760, longitude: 72.8777 }
      },
      {
        name: 'Negative coordinates',
        body: 'Location: -33.8688, 151.2093',
        expected: { latitude: -33.8688, longitude: 151.2093 }
      },
      {
        name: 'Invalid format',
        body: 'This is not a location message',
        expected: null
      }
    ];

    console.log('\n🧪 Testing location extraction for different formats:');
    console.log('======================================================');

    for (const testCase of testCases) {
      console.log(`\n📝 Testing: ${testCase.name}`);
      console.log(`   Input: "${testCase.body}"`);
      
      const result = extractCoordinatesFromWhatsAppLocation(testCase.body);
      
      if (result) {
        console.log(`   ✅ Extracted: ${result.latitude}, ${result.longitude}`);
        if (testCase.expected) {
          const latMatch = Math.abs(result.latitude - testCase.expected.latitude) < 0.0001;
          const lngMatch = Math.abs(result.longitude - testCase.expected.longitude) < 0.0001;
          if (latMatch && lngMatch) {
            console.log(`   ✅ Expected match: ${testCase.expected.latitude}, ${testCase.expected.longitude}`);
          } else {
            console.log(`   ❌ Expected: ${testCase.expected.latitude}, ${testCase.expected.longitude}`);
          }
        }
      } else {
        console.log(`   ❌ No coordinates extracted`);
        if (testCase.expected === null) {
          console.log(`   ✅ Expected: No coordinates (correct)`);
        } else {
          console.log(`   ❌ Expected: ${testCase.expected.latitude}, ${testCase.expected.longitude}`);
        }
      }
    }

    // Test with real location messages from database
    console.log('\n📊 Analyzing real location messages from database:');
    console.log('==================================================');

    const realMessages = await Message.find({
      location: { $exists: true },
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ timestamp: -1 }).limit(10);

    console.log(`Found ${realMessages.length} location messages in the last 7 days:`);

    realMessages.forEach((msg, index) => {
      console.log(`\n${index + 1}. From: ${msg.from}`);
      console.log(`   Body: "${msg.body}"`);
      console.log(`   Location: ${msg.location?.latitude}, ${msg.location?.longitude}`);
      console.log(`   Address: ${msg.address || 'N/A'}`);
      console.log(`   Timestamp: ${msg.timestamp}`);
      
      // Try to extract coordinates from the body
      if (msg.body && msg.body !== '[location message]') {
        const extracted = extractCoordinatesFromWhatsAppLocation(msg.body);
        if (extracted) {
          console.log(`   ✅ Could extract from body: ${extracted.latitude}, ${extracted.longitude}`);
        } else {
          console.log(`   ❌ Could not extract from body`);
        }
      } else {
        console.log(`   ℹ️  No text body (likely Twilio native location)`);
      }
    });

    // Check if there are any users who have sent location messages
    console.log('\n👥 Users who have sent location messages:');
    console.log('=========================================');

    const uniqueSenders = [...new Set(realMessages.map(msg => msg.from))];
    
    for (const sender of uniqueSenders) {
      const phone = sender.replace('whatsapp:', '');
      const userNumbers = [phone];
      if (phone.startsWith('+91')) userNumbers.push(phone.replace('+91', '91'));
      if (phone.startsWith('+')) userNumbers.push(phone.substring(1));
      userNumbers.push(phone.slice(-10));

      const users = await User.find({ contactNumber: { $in: userNumbers } });
      const userCount = users.length;
      
      console.log(`\n📱 ${sender}:`);
      console.log(`   Phone variations: ${userNumbers.join(', ')}`);
      console.log(`   Users found: ${userCount}`);
      
      if (userCount > 0) {
        users.forEach(user => {
          console.log(`   ✅ User: ${user.name} (${user.contactNumber})`);
          if (user.location && user.location.coordinates) {
            console.log(`      Location: ${user.location.coordinates[1]}, ${user.location.coordinates[0]}`);
            console.log(`      Maps Link: ${user.mapsLink || 'N/A'}`);
          } else {
            console.log(`      Location: Not set`);
          }
        });
      } else {
        console.log(`   ❌ No users found with this phone number`);
      }
    }

    console.log('\n✅ WhatsApp location format test completed!');

  } catch (error) {
    console.error('❌ Error testing WhatsApp location formats:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testWhatsAppLocationFormats();
