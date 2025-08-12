import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { Message } from '../server/models/Message.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TEMPLATE_SID = 'HXbdb716843483717790c45c951b71701e';

async function checkRecentReminders() {
  try {
    console.log('🔍 CHECKING RECENT VENDOR REMINDERS');
    console.log('===================================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');
    
    const now = moment().tz('Asia/Kolkata');
    console.log(`🕐 Current time (IST): ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Check reminders sent today
    const today = moment().tz('Asia/Kolkata').startOf('day').toDate();
    const bodyRegex = new RegExp(TEMPLATE_SID, 'i');
    
    const todayReminders = await Message.find({
      body: { $regex: bodyRegex },
      timestamp: { $gte: today },
      direction: 'outbound'
    }).sort({ timestamp: -1 });
    
    console.log(`\n📊 REMINDERS SENT TODAY:`);
    console.log(`- Total reminders: ${todayReminders.length}`);
    
    if (todayReminders.length === 0) {
      console.log('❌ No reminders sent today');
    } else {
      console.log('\n📋 Recent reminders:');
      todayReminders.slice(0, 10).forEach((reminder, index) => {
        const time = moment(reminder.timestamp).tz('Asia/Kolkata').format('HH:mm:ss');
        const minutesBefore = reminder.meta?.minutesBefore || 'unknown';
        console.log(`${index + 1}. ${reminder.to} - ${time} (${minutesBefore} min before opening)`);
      });
    }
    
    // Check reminders sent in the last 7 days
    const weekAgo = moment().tz('Asia/Kolkata').subtract(7, 'days').startOf('day').toDate();
    
    const weekReminders = await Message.find({
      body: { $regex: bodyRegex },
      timestamp: { $gte: weekAgo },
      direction: 'outbound'
    }).sort({ timestamp: -1 });
    
    console.log(`\n📊 REMINDERS SENT IN LAST 7 DAYS:`);
    console.log(`- Total reminders: ${weekReminders.length}`);
    
    if (weekReminders.length > 0) {
      // Group by date
      const remindersByDate = {};
      weekReminders.forEach(reminder => {
        const date = moment(reminder.timestamp).tz('Asia/Kolkata').format('YYYY-MM-DD');
        if (!remindersByDate[date]) {
          remindersByDate[date] = [];
        }
        remindersByDate[date].push(reminder);
      });
      
      console.log('\n📅 Reminders by date:');
      Object.keys(remindersByDate).sort().reverse().forEach(date => {
        const count = remindersByDate[date].length;
        console.log(`- ${date}: ${count} reminders`);
      });
    }
    
    // Check if cron job is running by looking for recent activity
    const lastHour = moment().tz('Asia/Kolkata').subtract(1, 'hour').toDate();
    const recentActivity = await Message.find({
      body: { $regex: bodyRegex },
      timestamp: { $gte: lastHour },
      direction: 'outbound'
    });
    
    console.log(`\n⏰ CRON JOB STATUS:`);
    console.log(`- Reminders in last hour: ${recentActivity.length}`);
    
    if (recentActivity.length === 0) {
      console.log('⚠️ No recent activity - cron job might not be running');
    } else {
      console.log('✅ Cron job appears to be running');
    }
    
    // Check for any errors in recent messages
    const recentErrors = await Message.find({
      timestamp: { $gte: lastHour },
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
    console.error('❌ Error checking recent reminders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkRecentReminders();

