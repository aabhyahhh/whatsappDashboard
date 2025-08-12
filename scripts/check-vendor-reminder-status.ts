import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TEMPLATE_SID = 'HXbdb716843483717790c45c951b71701e';

async function checkVendorReminderStatus() {
  try {
    console.log('🔍 CHECKING VENDOR REMINDER STATUS');
    console.log('==================================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');
    
    const now = moment().tz('Asia/Kolkata');
    console.log(`🕐 Current time (IST): ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Check recent reminders (last 2 hours)
    const twoHoursAgo = moment().tz('Asia/Kolkata').subtract(2, 'hours').toDate();
    const bodyRegex = new RegExp(TEMPLATE_SID, 'i');
    
    const recentReminders = await Message.find({
      body: { $regex: bodyRegex },
      timestamp: { $gte: twoHoursAgo },
      direction: 'outbound'
    }).sort({ timestamp: -1 });
    
    console.log(`\n📊 RECENT REMINDERS (Last 2 hours):`);
    console.log(`- Total reminders: ${recentReminders.length}`);
    
    if (recentReminders.length > 0) {
      console.log('\n📋 Recent reminders with metadata:');
      recentReminders.slice(0, 10).forEach((reminder, index) => {
        const time = moment(reminder.timestamp).tz('Asia/Kolkata').format('HH:mm:ss');
        const minutesBefore = reminder.meta?.minutesBefore || 'unknown';
        const reminderType = reminder.meta?.reminderType || 'unknown';
        const vendorName = reminder.meta?.vendorName || 'unknown';
        console.log(`${index + 1}. ${reminder.to} - ${time} (${minutesBefore} min before, ${reminderType}, ${vendorName})`);
      });
    }
    
    // Check vendors that should be getting reminders soon
    const users = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $ne: null },
      'operatingHours.openTime': { $exists: true, $ne: null }
    });
    
    console.log(`\n📊 VENDORS ANALYSIS:`);
    console.log(`- Total vendors with WhatsApp consent and operating hours: ${users.length}`);
    
    // Find vendors that should be getting reminders in the next 30 minutes
    const upcomingReminders = [];
    
    for (const user of users) {
      if (!user.operatingHours?.openTime) continue;
      
      // Parse the open time
      const openTime = moment.tz(user.operatingHours.openTime, 'h:mm A', 'Asia/Kolkata');
      openTime.set({
        year: now.year(),
        month: now.month(),
        date: now.date(),
      });
      
      const diff = openTime.diff(now, 'minutes');
      
      // Check if vendor should get reminder in next 30 minutes
      if (diff >= 0 && diff <= 30) {
        upcomingReminders.push({
          name: user.name,
          contactNumber: user.contactNumber,
          openTime: user.operatingHours.openTime,
          minutesUntilOpen: diff,
          shouldGet15MinReminder: diff === 15,
          shouldGetOpenTimeReminder: diff === 0
        });
      }
    }
    
    console.log(`\n⏰ UPCOMING REMINDERS (Next 30 minutes):`);
    console.log(`- Vendors in range: ${upcomingReminders.length}`);
    
    if (upcomingReminders.length > 0) {
      upcomingReminders.forEach((vendor, index) => {
        const reminderType = vendor.shouldGet15MinReminder ? '15-min' : 
                           vendor.shouldGetOpenTimeReminder ? 'open-time' : 
                           'none';
        console.log(`${index + 1}. ${vendor.name} (${vendor.contactNumber})`);
        console.log(`   - Open time: ${vendor.openTime}`);
        console.log(`   - Minutes until open: ${vendor.minutesUntilOpen}`);
        console.log(`   - Should get reminder: ${reminderType}`);
      });
    } else {
      console.log('   No vendors in reminder range for the next 30 minutes');
    }
    
    // Check if cron job is running by looking for recent activity
    const last30Minutes = moment().tz('Asia/Kolkata').subtract(30, 'minutes').toDate();
    const recentActivity = await Message.find({
      body: { $regex: bodyRegex },
      timestamp: { $gte: last30Minutes },
      direction: 'outbound'
    });
    
    console.log(`\n⏰ CRON JOB STATUS:`);
    console.log(`- Reminders in last 30 minutes: ${recentActivity.length}`);
    
    if (recentActivity.length === 0) {
      console.log('⚠️ No recent activity - cron job might not be running');
    } else {
      console.log('✅ Cron job appears to be running');
    }
    
    // Check for any errors in recent messages
    const recentErrors = await Message.find({
      timestamp: { $gte: last30Minutes },
      direction: 'outbound',
      errorCode: { $exists: true, $ne: null }
    });
    
    console.log(`\n❌ RECENT ERRORS:`);
    console.log(`- Error count: ${recentErrors.length}`);
    
    if (recentErrors.length > 0) {
      recentErrors.slice(0, 5).forEach((error, index) => {
        const time = moment(error.timestamp).tz('Asia/Kolkata').format('HH:mm:ss');
        console.log(`${index + 1}. ${error.to} - ${time} - ${error.errorCode}: ${error.errorMessage}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking vendor reminder status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkVendorReminderStatus();
