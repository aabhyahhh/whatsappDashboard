import mongoose from 'mongoose';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import moment from 'moment-timezone';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;

// Test the improved hasLocationToday function
async function testHasLocationToday() {
  console.log('\n🧪 TESTING hasLocationToday FUNCTION');
  console.log('=====================================');
  
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  
  // Test 1: Check for location coordinates
  const locationMessages = await Message.find({
    from: { $in: ['919876543210', 'whatsapp:919876543210'] },
    'location.latitude': { $exists: true },
    timestamp: { $gte: since }
  });
  
  console.log(`Location coordinate messages today: ${locationMessages.length}`);
  
  // Test 2: Check for text responses about location
  const textResponses = await Message.find({
    from: { $in: ['919876543210', 'whatsapp:919876543210'] },
    body: { $regex: /location|shared|updated/i },
    timestamp: { $gte: since }
  });
  
  console.log(`Text responses about location today: ${textResponses.length}`);
  
  // Test 3: Combined query (what the new function does)
  const combinedMessages = await Message.find({
    from: { $in: ['919876543210', 'whatsapp:919876543210'] },
    timestamp: { $gte: since },
    $or: [
      { 'location.latitude': { $exists: true } },
      { body: { $regex: /location|shared|updated/i } }
    ]
  });
  
  console.log(`Combined location messages today: ${combinedMessages.length}`);
  
  return combinedMessages.length > 0;
}

// Test the improved hasReminderSentToday function
async function testHasReminderSentToday() {
  console.log('\n🧪 TESTING hasReminderSentToday FUNCTION');
  console.log('=========================================');
  
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const TEMPLATE_SID = 'HXbdb716843483717790c45c951b71701e';
  
  // Test 1: Check for exact template SID match
  const templateMatches = await Message.find({
    to: { $in: ['919876543210', 'whatsapp:919876543210'] },
    body: TEMPLATE_SID,
    timestamp: { $gte: since }
  });
  
  console.log(`Template SID matches today: ${templateMatches.length}`);
  
  // Test 2: Check for meta data match
  const metaMatches = await Message.find({
    to: { $in: ['919876543210', 'whatsapp:919876543210'] },
    'meta.reminderType': 'vendor_location_15min',
    timestamp: { $gte: since }
  });
  
  console.log(`Meta data matches today: ${metaMatches.length}`);
  
  // Test 3: Combined query (what the new function does)
  const combinedReminders = await Message.find({
    to: { $in: ['919876543210', 'whatsapp:919876543210'] },
    $or: [
      { body: TEMPLATE_SID },
      { 'meta.reminderType': 'vendor_location_15min' }
    ],
    timestamp: { $gte: since }
  });
  
  console.log(`Combined reminders today: ${combinedReminders.length}`);
  
  return combinedReminders.length > 0;
}

// Test the new hasRespondedTo15MinReminder function
async function testHasRespondedTo15MinReminder() {
  console.log('\n🧪 TESTING hasRespondedTo15MinReminder FUNCTION');
  console.log('===============================================');
  
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  
  // Test 1: Check if 15-min reminder was sent today
  const reminderSent = await Message.findOne({
    to: { $in: ['919876543210', 'whatsapp:919876543210'] },
    'meta.reminderType': 'vendor_location_15min',
    timestamp: { $gte: since }
  }).sort({ timestamp: -1 });
  
  if (!reminderSent) {
    console.log('No 15-min reminder sent today');
    return false;
  }
  
  console.log(`15-min reminder sent at: ${reminderSent.timestamp}`);
  
  // Test 2: Check if vendor responded after the reminder
  const response = await Message.findOne({
    from: { $in: ['919876543210', 'whatsapp:919876543210'] },
    timestamp: { $gte: reminderSent.timestamp },
    $or: [
      { 'location.latitude': { $exists: true } },
      { body: { $regex: /location|shared|updated/i } }
    ]
  });
  
  if (response) {
    console.log(`Vendor responded at: ${response.timestamp}`);
    console.log(`Response type: ${response.location ? 'Location shared' : 'Text response'}`);
    return true;
  } else {
    console.log('No response from vendor after 15-min reminder');
    return false;
  }
}

// Test time parsing improvements
async function testTimeParsing() {
  console.log('\n🧪 TESTING TIME PARSING IMPROVEMENTS');
  console.log('=====================================');
  
  const testTimes = [
    '9:00 AM',
    '14:30',
    '3:45 PM',
    'invalid time',
    '12:00 PM'
  ];
  
  for (const timeStr of testTimes) {
    try {
      const parsedTime = moment.tz(timeStr, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
      
      if (parsedTime.isValid()) {
        console.log(`✅ "${timeStr}" -> ${parsedTime.format('HH:mm')}`);
      } else {
        console.log(`❌ "${timeStr}" -> Invalid format`);
      }
    } catch (error) {
      console.log(`❌ "${timeStr}" -> Error: ${error.message}`);
    }
  }
}

// Main test function
async function runTests() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔍 TESTING LOCATION REMINDER IMPROVEMENTS');
    console.log('==========================================');
    
    // Run all tests
    await testHasLocationToday();
    await testHasReminderSentToday();
    await testHasRespondedTo15MinReminder();
    await testTimeParsing();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running tests:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runTests();
