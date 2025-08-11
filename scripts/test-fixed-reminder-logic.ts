import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import moment from 'moment-timezone';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;

// Helper: Check if a location was received from user today
async function hasLocationToday(contactNumber: string) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const messages = await Message.find({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    'location.latitude': { $exists: true },
    timestamp: { $gte: since }
  });
  return messages.length > 0;
}

// Helper: Check if a reminder was sent today
async function hasReminderSentToday(contactNumber: string, minutesBefore: number) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const TEMPLATE_SID = 'HXbdb716843483717790c45c951b71701e';
  const bodyRegex = new RegExp(TEMPLATE_SID, 'i');
  const messages = await Message.find({
    to: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    body: { $regex: bodyRegex },
    timestamp: { $gte: since },
    'meta.minutesBefore': minutesBefore
  });
  return messages.length > 0;
}

async function testFixedReminderLogic() {
  try {
    await mongoose.connect(MONGO_URI!);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧪 TESTING FIXED REMINDER LOGIC');
    console.log('==================================');
    
    const now = moment().tz('Asia/Kolkata');
    console.log(`Current time: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    
    const vendorsWithHours = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $ne: null },
      'operatingHours.openTime': { $exists: true, $ne: null }
    });
    
    console.log(`📊 Found ${vendorsWithHours.length} vendors with WhatsApp consent and operating hours`);
    
    // Test the logic for a few vendors
    for (const vendor of vendorsWithHours.slice(0, 5)) {
      if (!vendor.operatingHours || !vendor.operatingHours.openTime) continue;
      
      const openTime = moment.tz(vendor.operatingHours.openTime, 'h:mm A', 'Asia/Kolkata');
      openTime.set({
        year: now.year(),
        month: now.month(),
        date: now.date(),
      });
      
      const diff = openTime.diff(now, 'minutes');
      
      console.log(`\n🏪 ${vendor.name} (${vendor.contactNumber})`);
      console.log(`   Opens at: ${openTime.format('HH:mm')}`);
      console.log(`   Time until open: ${diff} minutes`);
      
      // Test 15-minute reminder logic
      if (diff === 15) {
        const alreadySent15 = await hasReminderSentToday(vendor.contactNumber, 15);
        console.log(`   📤 15-min reminder: ${alreadySent15 ? 'Already sent' : 'Would send'}`);
      }
      
      // Test opening time reminder logic
      if (diff === 0) {
        const hasLocation = await hasLocationToday(vendor.contactNumber);
        const alreadySent0 = await hasReminderSentToday(vendor.contactNumber, 0);
        
        console.log(`   📍 Has location today: ${hasLocation ? 'Yes' : 'No'}`);
        console.log(`   📤 Opening time reminder: ${hasLocation ? 'Skip (location shared)' : alreadySent0 ? 'Already sent' : 'Would send'}`);
      }
      
      // Test general case
      if (diff > 0 && diff <= 60) {
        console.log(`   ⏰ Would be eligible for reminder in ${diff} minutes`);
      }
    }
    
    console.log('\n✅ Fixed reminder logic test completed!');
    console.log('\n📋 SUMMARY OF CHANGES:');
    console.log('1. Only 2 messages maximum per vendor per day');
    console.log('2. First message: 15 minutes before opening time');
    console.log('3. Second message: At opening time (only if location not shared)');
    console.log('4. Location sharing check prevents duplicate messages');
    
  } catch (err) {
    console.error('❌ Error in test:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testFixedReminderLogic(); 