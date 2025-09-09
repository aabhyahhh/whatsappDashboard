// Comprehensive analysis of support call reminder system
import 'dotenv/config';
import { connectDB } from '../server/db.ts';
import { Contact } from '../server/models/Contact.js';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';

const SUPPORT_TEMPLATE_ID = 'HX4c78928e13eda15597c00ea0915f1f77';
const CONFIRMATION_TEMPLATE_ID = 'HXd71a47a5df1f4c784fc2f8155bb349ca';

console.log('🔍 Support Call Reminder System Analysis');
console.log('=======================================');
console.log('');

// Connect to database
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
console.log('1️⃣ System Configuration Check');
console.log('-----------------------------');

const requiredEnvVars = ['TWILIO_PHONE_NUMBER', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
} else {
  console.log('✅ All required environment variables are set');
}

console.log(`📋 Support Template ID: ${SUPPORT_TEMPLATE_ID}`);
console.log(`📋 Confirmation Template ID: ${CONFIRMATION_TEMPLATE_ID}`);
console.log('');

// Test 2: Check inactive vendors
console.log('2️⃣ Inactive Vendor Analysis');
console.log('----------------------------');

const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
console.log(`📅 Three days ago: ${threeDaysAgo.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

// Find contacts not seen in 3+ days
const inactiveContacts = await Contact.find({ lastSeen: { $lte: threeDaysAgo } });
console.log(`📊 Found ${inactiveContacts.length} inactive contacts`);

// Check which inactive contacts are registered vendors
let inactiveVendors = [];
let inactiveNonVendors = [];

for (const contact of inactiveContacts) {
  const vendor = await User.findOne({ contactNumber: contact.phone });
  if (vendor) {
    inactiveVendors.push({
      name: vendor.name,
      phone: contact.phone,
      lastSeen: contact.lastSeen,
      daysInactive: Math.floor((Date.now() - contact.lastSeen.getTime()) / (24 * 60 * 60 * 1000))
    });
  } else {
    inactiveNonVendors.push({
      phone: contact.phone,
      lastSeen: contact.lastSeen
    });
  }
}

console.log(`📊 Inactive registered vendors: ${inactiveVendors.length}`);
console.log(`📊 Inactive non-vendors: ${inactiveNonVendors.length}`);

if (inactiveVendors.length > 0) {
  console.log('\n📋 Inactive Vendors (would receive support reminders):');
  inactiveVendors.slice(0, 10).forEach((vendor, index) => {
    console.log(`   ${index + 1}. ${vendor.name} (${vendor.phone}) - ${vendor.daysInactive} days inactive`);
  });
  
  if (inactiveVendors.length > 10) {
    console.log(`   ... and ${inactiveVendors.length - 10} more`);
  }
}

console.log('');

// Test 3: Check recent support reminder activity
console.log('3️⃣ Recent Support Reminder Activity');
console.log('-----------------------------------');

const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

// Check support reminder logs
const recentReminderLogs = await SupportCallReminderLog.find({
  sentAt: { $gte: today }
}).sort({ sentAt: -1 });

console.log(`📊 Support reminders sent today: ${recentReminderLogs.length}`);

if (recentReminderLogs.length > 0) {
  console.log('\n📋 Today\'s support reminders:');
  recentReminderLogs.forEach((log, index) => {
    const time = log.sentAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`   ${index + 1}. ${log.contactNumber} at ${time}`);
  });
}

// Check support reminder messages
const recentSupportMessages = await Message.find({
  direction: 'outbound',
  body: SUPPORT_TEMPLATE_ID,
  timestamp: { $gte: today, $lt: tomorrow }
}).sort({ timestamp: -1 });

console.log(`📊 Support template messages sent today: ${recentSupportMessages.length}`);

console.log('');

// Test 4: Check support call responses
console.log('4️⃣ Support Call Response Analysis');
console.log('---------------------------------');

// Check for "yes_support" button responses
const supportResponses = await Message.find({
  direction: 'inbound',
  'meta.type': 'support_confirmation',
  timestamp: { $gte: today, $lt: tomorrow }
}).sort({ timestamp: -1 });

console.log(`📊 Support call responses today: ${supportResponses.length}`);

// Check for confirmation messages sent
const confirmationMessages = await Message.find({
  direction: 'outbound',
  body: CONFIRMATION_TEMPLATE_ID,
  timestamp: { $gte: today, $lt: tomorrow }
}).sort({ timestamp: -1 });

console.log(`📊 Support confirmation messages sent today: ${confirmationMessages.length}`);

console.log('');

// Test 5: Check scheduler status
console.log('5️⃣ Scheduler Status Check');
console.log('-------------------------');

// Check if scheduler is running by looking for recent activity
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const weeklyReminderLogs = await SupportCallReminderLog.find({
  sentAt: { $gte: lastWeek }
}).sort({ sentAt: -1 });

console.log(`📊 Support reminders sent in last 7 days: ${weeklyReminderLogs.length}`);

if (weeklyReminderLogs.length > 0) {
  const lastReminder = weeklyReminderLogs[0];
  const hoursSinceLastReminder = Math.floor((Date.now() - lastReminder.sentAt.getTime()) / (60 * 60 * 1000));
  console.log(`📅 Last reminder sent: ${lastReminder.sentAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  console.log(`⏰ Hours since last reminder: ${hoursSinceLastReminder}`);
  
  if (hoursSinceLastReminder > 24) {
    console.log('⚠️ No reminders sent in last 24 hours - scheduler may not be running');
  } else {
    console.log('✅ Scheduler appears to be running (recent activity found)');
  }
} else {
  console.log('⚠️ No support reminders sent in last 7 days - scheduler may not be running');
}

console.log('');

// Test 6: Check vendor eligibility for next reminder
console.log('6️⃣ Vendor Eligibility for Next Reminder');
console.log('----------------------------------------');

let eligibleForReminder = [];
let notEligible = [];

for (const vendor of inactiveVendors) {
  // Check if reminder was sent in last 24 hours
  const lastReminder = await SupportCallReminderLog.findOne({
    contactNumber: vendor.phone
  }).sort({ sentAt: -1 });
  
  const shouldSendReminder = !lastReminder || 
    (Date.now() - lastReminder.sentAt.getTime()) >= 24 * 60 * 60 * 1000;
  
  if (shouldSendReminder) {
    eligibleForReminder.push(vendor);
  } else {
    const hoursSinceLastSent = Math.floor((Date.now() - lastReminder.sentAt.getTime()) / (60 * 60 * 1000));
    notEligible.push({
      ...vendor,
      hoursSinceLastSent
    });
  }
}

console.log(`📊 Vendors eligible for next reminder: ${eligibleForReminder.length}`);
console.log(`📊 Vendors not eligible (recently sent): ${notEligible.length}`);

if (eligibleForReminder.length > 0) {
  console.log('\n📋 Vendors who would receive next reminder:');
  eligibleForReminder.slice(0, 5).forEach((vendor, index) => {
    console.log(`   ${index + 1}. ${vendor.name} (${vendor.phone}) - ${vendor.daysInactive} days inactive`);
  });
  
  if (eligibleForReminder.length > 5) {
    console.log(`   ... and ${eligibleForReminder.length - 5} more`);
  }
}

console.log('');

// Test 7: Summary and recommendations
console.log('7️⃣ Summary and Recommendations');
console.log('-------------------------------');

console.log('📊 SYSTEM STATUS:');
console.log(`   • Total inactive contacts: ${inactiveContacts.length}`);
console.log(`   • Inactive registered vendors: ${inactiveVendors.length}`);
console.log(`   • Support reminders sent today: ${recentReminderLogs.length}`);
console.log(`   • Support responses received today: ${supportResponses.length}`);
console.log(`   • Vendors eligible for next reminder: ${eligibleForReminder.length}`);

console.log('');

if (inactiveVendors.length === 0) {
  console.log('✅ All vendors are active! No support reminders needed.');
} else if (recentReminderLogs.length === 0 && eligibleForReminder.length > 0) {
  console.log('⚠️ RECOMMENDATIONS:');
  console.log('   1. Check if support call reminder scheduler is running');
  console.log('   2. Verify Twilio credentials are set correctly');
  console.log('   3. Check server logs for scheduler errors');
  console.log('   4. Ensure scheduler is imported in main server file');
} else if (recentReminderLogs.length > 0) {
  console.log('✅ Support call reminder system is working correctly');
  console.log('   - Inactive vendors are being identified');
  console.log('   - Support reminders are being sent');
  console.log('   - System is tracking responses');
} else {
  console.log('ℹ️ System appears to be configured correctly');
  console.log('   - No inactive vendors currently need reminders');
}

console.log('');
console.log('✅ Support call reminder system analysis completed!');

// Close database connection
process.exit(0);
