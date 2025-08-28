import 'dotenv/config';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import { createFreshClient } from '../server/twilio.js';

const TEMPLATE_SID = 'HXbdb716843483717790c45c951b71701e';
const TEST_PHONE = '+918130026321';

async function testSpecificVendor() {
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

    // Find the test vendor
    const user = await User.findOne({ contactNumber: TEST_PHONE });
    if (!user) {
      console.error('❌ Test vendor not found');
      return;
    }

    console.log(`\n🔍 Test Vendor: ${user.name} (${user.contactNumber})`);
    console.log(`   WhatsApp Consent: ${user.whatsappConsent}`);
    console.log(`   Operating Hours: ${user.operatingHours?.openTime} - ${user.operatingHours?.closeTime}`);
    console.log(`   Days: ${user.operatingHours?.days}`);

    // Check if vendor is open today
    const today = now.day();
    if (!user.operatingHours.days || !user.operatingHours.days.includes(today)) {
      console.log(`   ⏩ Vendor not open today (day ${today})`);
      return;
    }

    // Parse opening time
    const openTime = moment.tz(user.operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
    if (!openTime.isValid()) {
      console.log(`   ⚠️ Invalid open time: ${user.operatingHours.openTime}`);
      return;
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

    console.log(`   📍 Location messages today: ${locationMessages.length}`);

    // Check if reminder was already sent today
    const reminderMessages = await Message.find({
      to: { $in: [user.contactNumber, `whatsapp:${user.contactNumber}`] },
      'meta.reminderType': { $in: ['vendor_location_15min', 'vendor_location_open'] },
      timestamp: { $gte: since }
    });

    console.log(`   📤 Reminders sent today: ${reminderMessages.length}`);

    // Send test reminder regardless of conditions
    console.log(`\n📤 Sending test reminder to ${user.name}...`);
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

      console.log(`✅ Test reminder sent successfully!`);
      console.log(`   SID: ${result.sid}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   To: ${result.to}`);
      console.log(`   From: ${result.from}`);

    } catch (error) {
      console.error(`❌ Failed to send test reminder: ${error.message}`);
      console.error(`   Error code: ${error.code}`);
      console.error(`   Error details:`, error);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testSpecificVendor();
