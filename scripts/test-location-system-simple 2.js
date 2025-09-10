// Simple test script for location update message system
import 'dotenv/config';
import moment from 'moment-timezone';
import { connectDB } from '../server/db.ts';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';

console.log('🧪 Testing Location Update Message System (Simple)');
console.log('==================================================');
console.log('');

// Connect to database first
console.log('🔌 Connecting to database...');
try {
  await connectDB();
  console.log('✅ Database connected successfully');
} catch (error) {
  console.log('❌ Database connection failed:', error.message);
  process.exit(1);
}

console.log('');

// Test 1: Check system configuration
console.log('1️⃣ Checking System Configuration');
console.log('--------------------------------');

// Check environment variables
const requiredEnvVars = ['TWILIO_PHONE_NUMBER', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
} else {
  console.log('✅ All required environment variables are set');
}

console.log('');

// Test 2: Check vendor eligibility
console.log('2️⃣ Checking Vendor Eligibility');
console.log('-------------------------------');

const eligibleVendors = await User.find({ 
  whatsappConsent: true,
  contactNumber: { $exists: true, $ne: null, $ne: '' },
  'operatingHours.openTime': { $exists: true, $ne: null }
});

console.log(`📊 Found ${eligibleVendors.length} eligible vendors`);

if (eligibleVendors.length === 0) {
  console.log('⚠️ No eligible vendors found. Check:');
  console.log('   - WhatsApp consent is enabled');
  console.log('   - Contact numbers are set');
  console.log('   - Operating hours are configured');
} else {
  console.log('✅ Eligible vendors found');
  
  // Show sample vendors
  console.log('\n📋 Sample eligible vendors:');
  eligibleVendors.slice(0, 3).forEach((vendor, index) => {
    console.log(`   ${index + 1}. ${vendor.name} (${vendor.contactNumber})`);
    console.log(`      Open time: ${vendor.operatingHours?.openTime}`);
    console.log(`      Days: ${vendor.operatingHours?.days?.join(', ')}`);
  });
}

console.log('');

// Test 3: Check today's reminder activity
console.log('3️⃣ Checking Today\'s Reminder Activity');
console.log('--------------------------------------');

const today = moment().tz('Asia/Kolkata').startOf('day').toDate();
const tomorrow = moment().tz('Asia/Kolkata').startOf('day').add(1, 'day').toDate();

const todayReminders = await Message.find({
  direction: 'outbound',
  timestamp: { $gte: today, $lt: tomorrow },
  'meta.reminderType': { $exists: true }
}).sort({ timestamp: -1 });

console.log(`📊 Found ${todayReminders.length} reminders sent today`);

if (todayReminders.length > 0) {
  console.log('\n📋 Today\'s reminders:');
  todayReminders.forEach((reminder, index) => {
    const time = moment(reminder.timestamp).tz('Asia/Kolkata').format('HH:mm');
    console.log(`   ${index + 1}. ${reminder.meta.reminderType} to ${reminder.to} at ${time}`);
  });
} else {
  console.log('ℹ️ No reminders sent today yet');
}

console.log('');

// Test 4: Check location sharing activity
console.log('4️⃣ Checking Location Sharing Activity');
console.log('-------------------------------------');

const todayLocations = await Message.find({
  direction: 'inbound',
  timestamp: { $gte: today, $lt: tomorrow },
  $or: [
    { 'location.latitude': { $exists: true } },
    { body: { $regex: /location|shared|updated|sent/i } }
  ]
}).sort({ timestamp: -1 });

console.log(`📊 Found ${todayLocations.length} location messages received today`);

if (todayLocations.length > 0) {
  console.log('\n📋 Today\'s location messages:');
  todayLocations.forEach((msg, index) => {
    const time = moment(msg.timestamp).tz('Asia/Kolkata').format('HH:mm');
    const hasCoords = msg.location?.latitude ? '📍' : '💬';
    console.log(`   ${index + 1}. ${hasCoords} From ${msg.from} at ${time}`);
  });
} else {
  console.log('ℹ️ No location messages received today yet');
}

console.log('');

// Test 5: Check current time and upcoming reminders
console.log('5️⃣ Checking Current Time and Upcoming Reminders');
console.log('------------------------------------------------');

const now = moment().tz('Asia/Kolkata');
console.log(`🕐 Current time: ${now.format('YYYY-MM-DD HH:mm:ss')} IST`);

// Check which vendors would get reminders right now
let upcomingReminders = [];
for (const vendor of eligibleVendors) {
  const today = now.day();
  if (!vendor.operatingHours.days || !vendor.operatingHours.days.includes(today)) {
    continue; // Not open today
  }
  
  try {
    const openTime = moment.tz(vendor.operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
    if (!openTime.isValid()) continue;
    
    openTime.set({
      year: now.year(),
      month: now.month(),
      date: now.date(),
    });
    
    const diff = openTime.diff(now, 'minutes');
    
    if (diff >= 14 && diff <= 16) {
      upcomingReminders.push({
        vendor: vendor.name,
        phone: vendor.contactNumber,
        type: '15-min reminder',
        timeUntil: `${diff} minutes`,
        openTime: vendor.operatingHours.openTime
      });
    } else if (diff >= -2 && diff <= 2) {
      upcomingReminders.push({
        vendor: vendor.name,
        phone: vendor.contactNumber,
        type: 'open-time reminder',
        timeUntil: `${diff} minutes`,
        openTime: vendor.operatingHours.openTime
      });
    }
  } catch (error) {
    // Skip invalid time formats
  }
}

if (upcomingReminders.length > 0) {
  console.log(`📊 ${upcomingReminders.length} vendors would get reminders right now:`);
  upcomingReminders.forEach((reminder, index) => {
    console.log(`   ${index + 1}. ${reminder.vendor} (${reminder.phone})`);
    console.log(`      ${reminder.type} - ${reminder.timeUntil} until ${reminder.openTime}`);
  });
} else {
  console.log('ℹ️ No vendors would get reminders right now');
}

console.log('');

// Test 6: Summary and recommendations
console.log('6️⃣ Summary and Recommendations');
console.log('-------------------------------');

const totalVendors = await User.countDocuments();
const whatsappConsent = await User.countDocuments({ whatsappConsent: true });
const withContact = await User.countDocuments({ 
  contactNumber: { $exists: true, $ne: null, $ne: '' } 
});
const withHours = await User.countDocuments({ 
  'operatingHours.openTime': { $exists: true, $ne: null } 
});

console.log('📊 System Status:');
console.log(`   Total vendors: ${totalVendors}`);
console.log(`   WhatsApp consent: ${whatsappConsent}`);
console.log(`   With contact numbers: ${withContact}`);
console.log(`   With operating hours: ${withHours}`);
console.log(`   Eligible for reminders: ${eligibleVendors.length}`);

console.log('');

if (eligibleVendors.length === 0) {
  console.log('⚠️ RECOMMENDATIONS:');
  console.log('   1. Check vendor data - ensure WhatsApp consent is enabled');
  console.log('   2. Verify contact numbers are properly set');
  console.log('   3. Configure operating hours for vendors');
} else if (todayReminders.length === 0) {
  console.log('⚠️ RECOMMENDATIONS:');
  console.log('   1. Check if current time matches vendor opening times');
  console.log('   2. Verify Twilio credentials and template SID');
  console.log('   3. Monitor cron job logs for errors');
} else {
  console.log('✅ System appears to be working correctly');
  console.log('   - Vendors are eligible for reminders');
  console.log('   - Reminders are being sent');
  console.log('   - Location messages are being received');
}

console.log('');
console.log('✅ Location update message system test completed!');

// Close database connection
process.exit(0);
