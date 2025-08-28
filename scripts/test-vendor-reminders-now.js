import 'dotenv/config';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import { createFreshClient } from '../server/twilio.js';

const TEMPLATE_SID = 'HXbdb716843483717790c45c951b71701e';

async function testVendorReminders() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const now = moment().tz('Asia/Kolkata');
    console.log(`🕐 Current time: ${now.format('YYYY-MM-DD HH:mm:ss')}`);

    // Get a fresh Twilio client
    const twilioClient = createFreshClient();
    if (!twilioClient) {
      console.error('❌ Twilio client not available');
      return;
    }

    // Get all vendors with WhatsApp consent and operating hours
    const users = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $ne: null, $ne: '' },
      'operatingHours.openTime': { $exists: true, $ne: null }
    });

    console.log(`📊 Found ${users.length} vendors with WhatsApp consent and operating hours`);

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`\n🔍 Processing: ${user.name} (${user.contactNumber})`);

        // Check if vendor is open today
        const today = now.day();
        if (!user.operatingHours.days || !user.operatingHours.days.includes(today)) {
          console.log(`   ⏩ Skipping - not open today (day ${today})`);
          skippedCount++;
          continue;
        }

        // Parse opening time
        const openTime = moment.tz(user.operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
        if (!openTime.isValid()) {
          console.log(`   ⚠️ Invalid open time: ${user.operatingHours.openTime}`);
          errorCount++;
          continue;
        }

        openTime.set({
          year: now.year(),
          month: now.month(),
          date: now.date(),
        });

        const diff = openTime.diff(now, 'minutes');
        console.log(`   🕐 Opening time: ${openTime.format('HH:mm')}, Diff: ${diff} minutes`);

        // Check if vendor has already shared location today
        const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
        const locationMessages = await Message.find({
          from: { $in: [user.contactNumber, `whatsapp:${user.contactNumber}`] },
          timestamp: { $gte: since },
          $or: [
            { 'location.latitude': { $exists: true } },
            { body: { $regex: /location|shared|updated/i } }
          ]
        });

        if (locationMessages.length > 0) {
          console.log(`   ⏩ Skipping - location already shared today (${locationMessages.length} messages)`);
          skippedCount++;
          continue;
        }

        // Check if reminder was already sent today
        const reminderMessages = await Message.find({
          to: { $in: [user.contactNumber, `whatsapp:${user.contactNumber}`] },
          'meta.reminderType': { $in: ['vendor_location_15min', 'vendor_location_open'] },
          timestamp: { $gte: since }
        });

        if (reminderMessages.length > 0) {
          console.log(`   ⏩ Skipping - reminder already sent today (${reminderMessages.length} reminders)`);
          skippedCount++;
          continue;
        }

        // Send test reminder
        console.log(`   📤 Sending test reminder...`);
        try {
          const result = await twilioClient.messages.create({
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${user.contactNumber}`,
            contentSid: TEMPLATE_SID,
            contentVariables: JSON.stringify({}),
          });

          await Message.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.contactNumber,
            body: TEMPLATE_SID,
            direction: 'outbound',
            timestamp: new Date(),
            meta: { 
              reminderType: 'vendor_location_test',
              vendorName: user.name,
              openTime: user.operatingHours.openTime,
              testRun: true
            },
            twilioSid: result.sid
          });

          console.log(`   ✅ Sent test reminder - SID: ${result.sid}`);
          sentCount++;

          // Only send to first 3 vendors for testing
          if (sentCount >= 3) {
            console.log(`\n🛑 Stopping after 3 test messages`);
            break;
          }

        } catch (error) {
          console.error(`   ❌ Failed to send reminder: ${error.message}`);
          errorCount++;
        }

      } catch (userError) {
        console.error(`   ❌ Error processing user: ${userError.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Test Summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testVendorReminders();
