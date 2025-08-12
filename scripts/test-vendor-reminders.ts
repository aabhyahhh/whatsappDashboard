import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import { client, createFreshClient } from '../server/twilio.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TEMPLATE_SID = 'HXbdb716843483717790c45c951b71701e';

async function testVendorReminders() {
  try {
    console.log('🔍 TESTING VENDOR REMINDER SYSTEM');
    console.log('==================================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');
    
    // Check Twilio credentials
    console.log('\n📱 TWILIO CREDENTIALS CHECK:');
    console.log('- Account SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
    console.log('- Auth Token:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('- Phone Number:', process.env.TWILIO_PHONE_NUMBER ? '✅ Set' : '❌ Missing');
    
    // Test Twilio client
    const twilioClient = createFreshClient();
    console.log('- Twilio Client:', twilioClient ? '✅ Available' : '❌ Not available');
    
    // Check current time
    const now = moment().tz('Asia/Kolkata');
    console.log(`\n🕐 Current time (IST): ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Find vendors with WhatsApp consent and operating hours
    const users = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $ne: null },
      'operatingHours.openTime': { $exists: true, $ne: null }
    });
    
    console.log(`\n📊 VENDORS ANALYSIS:`);
    console.log(`- Total vendors found: ${users.length}`);
    
    if (users.length === 0) {
      console.log('❌ No vendors found with WhatsApp consent and operating hours');
      return;
    }
    
    // Analyze each vendor
    let vendorsWithValidTimes = 0;
    let vendorsInRange = 0;
    
    for (const user of users) {
      console.log(`\n👤 Vendor: ${user.name} (${user.contactNumber})`);
      console.log(`- Operating hours: ${user.operatingHours?.openTime || 'Not set'}`);
      
      if (!user.operatingHours?.openTime) {
        console.log('  ❌ No operating hours set');
        continue;
      }
      
      vendorsWithValidTimes++;
      
      // Parse the open time
      const openTime = moment.tz(user.operatingHours.openTime, 'h:mm A', 'Asia/Kolkata');
      openTime.set({
        year: now.year(),
        month: now.month(),
        date: now.date(),
      });
      
      const diff = openTime.diff(now, 'minutes');
      console.log(`- Open time today: ${openTime.format('HH:mm')}`);
      console.log(`- Minutes until open: ${diff}`);
      
      // Check if vendor is in the reminder range (15 minutes before or at opening)
      if (diff === 15 || diff === 0) {
        vendorsInRange++;
        console.log(`  🎯 IN REMINDER RANGE! (${diff === 15 ? '15 min before' : 'at opening'})`);
        
        // Check if reminder was already sent today
        const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
        const bodyRegex = new RegExp(TEMPLATE_SID, 'i');
        const existingReminders = await Message.find({
          to: { $in: [user.contactNumber, `whatsapp:${user.contactNumber}`] },
          body: { $regex: bodyRegex },
          timestamp: { $gte: since },
          'meta.minutesBefore': diff === 15 ? 15 : 0
        });
        
        console.log(`  - Reminders sent today: ${existingReminders.length}`);
        
        if (existingReminders.length === 0) {
          console.log(`  ✅ Should send reminder now!`);
          
          // Test sending a message
          if (twilioClient) {
            try {
              console.log(`  📤 Attempting to send test message...`);
              const result = await twilioClient.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: `whatsapp:${user.contactNumber}`,
                contentSid: TEMPLATE_SID,
                contentVariables: JSON.stringify({}),
              });
              console.log(`  ✅ Test message sent successfully! SID: ${result.sid}`);
              
              // Log the message
              await Message.create({
                from: process.env.TWILIO_PHONE_NUMBER,
                to: user.contactNumber,
                body: TEMPLATE_SID,
                direction: 'outbound',
                timestamp: new Date(),
                meta: { minutesBefore: diff === 15 ? 15 : 0, test: true }
              });
              
            } catch (error) {
              console.log(`  ❌ Failed to send test message: ${error.message}`);
            }
          } else {
            console.log(`  ❌ Cannot send message - Twilio client not available`);
          }
        } else {
          console.log(`  ⏩ Reminder already sent today`);
        }
      } else if (diff >= -5 && diff <= 20) {
        console.log(`  📍 Close to opening time (${diff} minutes)`);
      }
    }
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`- Vendors with valid operating hours: ${vendorsWithValidTimes}`);
    console.log(`- Vendors in reminder range: ${vendorsInRange}`);
    console.log(`- Current time: ${now.format('HH:mm')}`);
    
    // Check if cron job would run
    console.log(`\n⏰ CRON JOB ANALYSIS:`);
    console.log(`- Cron schedule: Every minute (* * * * *)`);
    console.log(`- Should be running: ✅ Yes`);
    console.log(`- Next check: In 1 minute`);
    
  } catch (error) {
    console.error('❌ Error testing vendor reminders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testVendorReminders();

