import 'dotenv/config';
import mongoose from 'mongoose';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import moment from 'moment-timezone';
import { createFreshClient } from '../server/twilio.js';

const MONGO_URI = process.env.MONGODB_URI;
const TEMPLATE_SID = 'HXbdb716843483717790c45c951b71701e';
const TEST_VENDOR_NUMBER = '+918130026321';

// Test the improved hasLocationToday function
async function testHasLocationToday() {
  console.log('\n🧪 TESTING hasLocationToday FUNCTION');
  console.log('=====================================');
  
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  
  // Test 1: Check for location coordinates
  const locationMessages = await Message.find({
    from: { $in: [TEST_VENDOR_NUMBER, `whatsapp:${TEST_VENDOR_NUMBER}`] },
    'location.latitude': { $exists: true },
    timestamp: { $gte: since }
  });
  
  console.log(`Location coordinate messages today: ${locationMessages.length}`);
  
  // Test 2: Check for text responses about location
  const textResponses = await Message.find({
    from: { $in: [TEST_VENDOR_NUMBER, `whatsapp:${TEST_VENDOR_NUMBER}`] },
    body: { $regex: /location|shared|updated/i },
    timestamp: { $gte: since }
  });
  
  console.log(`Text responses about location today: ${textResponses.length}`);
  
  // Test 3: Combined query (what the new function does)
  const combinedMessages = await Message.find({
    from: { $in: [TEST_VENDOR_NUMBER, `whatsapp:${TEST_VENDOR_NUMBER}`] },
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
  
  // Test 1: Check for exact template SID match
  const templateMatches = await Message.find({
    to: { $in: [TEST_VENDOR_NUMBER, `whatsapp:${TEST_VENDOR_NUMBER}`] },
    body: TEMPLATE_SID,
    timestamp: { $gte: since }
  });
  
  console.log(`Template SID matches today: ${templateMatches.length}`);
  
  // Test 2: Check for meta data match
  const metaMatches = await Message.find({
    to: { $in: [TEST_VENDOR_NUMBER, `whatsapp:${TEST_VENDOR_NUMBER}`] },
    'meta.reminderType': 'vendor_location_15min',
    timestamp: { $gte: since }
  });
  
  console.log(`Meta data matches today: ${metaMatches.length}`);
  
  // Test 3: Combined query (what the new function does)
  const combinedReminders = await Message.find({
    to: { $in: [TEST_VENDOR_NUMBER, `whatsapp:${TEST_VENDOR_NUMBER}`] },
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
    to: { $in: [TEST_VENDOR_NUMBER, `whatsapp:${TEST_VENDOR_NUMBER}`] },
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
    from: { $in: [TEST_VENDOR_NUMBER, `whatsapp:${TEST_VENDOR_NUMBER}`] },
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

// Test sending an actual reminder message
async function testSendReminderMessage() {
  console.log('\n🚀 TESTING ACTUAL REMINDER MESSAGE SENDING');
  console.log('==========================================');
  
  try {
    // Get fresh Twilio client
    const twilioClient = createFreshClient();
    if (!twilioClient) {
      console.error('❌ Twilio client not available');
      return false;
    }
    
    console.log(`📱 Sending test reminder to ${TEST_VENDOR_NUMBER}...`);
    
    // Send the test message
    const result = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${TEST_VENDOR_NUMBER}`,
      contentSid: TEMPLATE_SID,
      contentVariables: JSON.stringify({}),
    });
    
    console.log(`✅ Test message sent successfully!`);
    console.log(`📋 Twilio SID: ${result.sid}`);
    console.log(`📱 To: ${TEST_VENDOR_NUMBER}`);
    console.log(`📝 Template: ${TEMPLATE_SID}`);
    
    // Log the message to database
    await Message.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: TEST_VENDOR_NUMBER,
      body: TEMPLATE_SID,
      direction: 'outbound',
      timestamp: new Date(),
      meta: { 
        minutesBefore: 0,
        reminderType: 'vendor_location_test',
        vendorName: 'test_vendor',
        openTime: '9:00 AM',
        testMessage: true
      },
      twilioSid: result.sid
    });
    
    console.log(`💾 Message logged to database successfully`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to send test message:`, error.message);
    return false;
  }
}

// Test vendor eligibility check
async function testVendorEligibility() {
  console.log('\n👥 TESTING VENDOR ELIGIBILITY');
  console.log('==============================');
  
  try {
    // Check if test vendor exists in database
    const vendor = await User.findOne({ contactNumber: TEST_VENDOR_NUMBER });
    
    if (!vendor) {
      console.log(`⚠️ Test vendor ${TEST_VENDOR_NUMBER} not found in database`);
      console.log('Creating test vendor record...');
      
      // Create a test vendor record
      const testVendor = await User.create({
        name: 'test_vendor',
        contactNumber: TEST_VENDOR_NUMBER,
        whatsappConsent: true,
        operatingHours: {
          openTime: '9:00 AM',
          closeTime: '6:00 PM',
          days: [1, 2, 3, 4, 5, 6] // Monday to Saturday
        }
      });
      
      console.log(`✅ Test vendor created: ${testVendor.name}`);
      return true;
    } else {
      console.log(`✅ Test vendor found: ${vendor.name}`);
      console.log(`📱 Contact: ${vendor.contactNumber}`);
      console.log(`✅ WhatsApp consent: ${vendor.whatsappConsent}`);
      console.log(`🕐 Operating hours: ${vendor.operatingHours?.openTime || 'Not set'}`);
      return true;
    }
    
  } catch (error) {
    console.error(`❌ Error checking vendor eligibility:`, error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔍 TESTING LOCATION REMINDER IMPROVEMENTS');
    console.log('==========================================');
    console.log(`🎯 Test vendor: ${TEST_VENDOR_NUMBER}`);
    
    // Test vendor eligibility first
    const vendorEligible = await testVendorEligibility();
    if (!vendorEligible) {
      console.log('❌ Vendor eligibility test failed - stopping tests');
      return;
    }
    
    // Run function tests
    await testHasLocationToday();
    await testHasReminderSentToday();
    await testHasRespondedTo15MinReminder();
    await testTimeParsing();
    
    // Send actual test message
    const messageSent = await testSendReminderMessage();
    
    if (messageSent) {
      console.log('\n🎉 SUCCESS: Test reminder message sent!');
      console.log('📱 Check your WhatsApp to see the test message');
      console.log('📊 Check the database to verify message logging');
    } else {
      console.log('\n❌ FAILED: Could not send test message');
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Error running tests:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runTests();
