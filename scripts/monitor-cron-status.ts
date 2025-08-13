import mongoose from 'mongoose';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import moment from 'moment-timezone';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;

async function monitorCronStatus() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔍 CRON JOB STATUS MONITOR');
    console.log('============================');
    
    const now = moment().tz('Asia/Kolkata');
    console.log(`Current time: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Check 1: Recent reminder activity
    console.log('\n📊 RECENT REMINDER ACTIVITY (Last 24 hours)');
    console.log('---------------------------------------------');
    
    const since = moment().tz('Asia/Kolkata').subtract(24, 'hours').toDate();
    const recentReminders = await Message.find({
      body: { $regex: /HXbdb716843483717790c45c951b71701e/i },
      timestamp: { $gte: since }
    }).sort({ timestamp: -1 });
    
    console.log(`Total reminders sent in last 24h: ${recentReminders.length}`);
    
    if (recentReminders.length > 0) {
      console.log('\nRecent reminders:');
      recentReminders.slice(0, 10).forEach(reminder => {
        const timeAgo = moment(reminder.timestamp).fromNow();
        console.log(`  - ${reminder.to}: ${timeAgo} (${reminder.meta?.reminderType || 'unknown'})`);
      });
    } else {
      console.log('⚠️  No reminders sent in the last 24 hours');
    }
    
    // Check 2: Today's reminder activity
    console.log('\n📅 TODAY\'S REMINDER ACTIVITY');
    console.log('-----------------------------');
    
    const todayStart = moment().tz('Asia/Kolkata').startOf('day').toDate();
    const todayReminders = await Message.find({
      body: { $regex: /HXbdb716843483717790c45c951b71701e/i },
      timestamp: { $gte: todayStart }
    });
    
    console.log(`Reminders sent today: ${todayReminders.length}`);
    
    // Group by reminder type
    const reminderTypes = {};
    todayReminders.forEach(reminder => {
      const type = reminder.meta?.reminderType || 'unknown';
      reminderTypes[type] = (reminderTypes[type] || 0) + 1;
    });
    
    Object.entries(reminderTypes).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    
    // Check 3: Vendor eligibility
    console.log('\n👥 VENDOR ELIGIBILITY CHECK');
    console.log('----------------------------');
    
    const eligibleVendors = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $ne: null },
      'operatingHours.openTime': { $exists: true, $ne: null }
    });
    
    console.log(`Eligible vendors: ${eligibleVendors.length}`);
    
    // Check which vendors would get reminders right now
    let vendorsDueFor15Min = 0;
    let vendorsDueForOpen = 0;
    
    for (const vendor of eligibleVendors) {
      const openTime = moment.tz(vendor.operatingHours.openTime, 'h:mm A', 'Asia/Kolkata');
      openTime.set({
        year: now.year(),
        month: now.month(),
        date: now.date(),
      });
      const diff = openTime.diff(now, 'minutes');
      
      if (diff >= 14 && diff <= 16) {
        vendorsDueFor15Min++;
      }
      
      if (diff >= -2 && diff <= 2) {
        vendorsDueForOpen++;
      }
    }
    
    console.log(`Vendors due for 15-min reminder: ${vendorsDueFor15Min}`);
    console.log(`Vendors due for open-time reminder: ${vendorsDueForOpen}`);
    
    // Check 4: System errors
    console.log('\n🚨 SYSTEM ERRORS (Last 24 hours)');
    console.log('---------------------------------');
    
    const recentErrors = await Message.find({
      'meta.type': 'reminder_error',
      timestamp: { $gte: since }
    }).sort({ timestamp: -1 });
    
    console.log(`Error logs in last 24h: ${recentErrors.length}`);
    
    if (recentErrors.length > 0) {
      console.log('\nRecent errors:');
      recentErrors.slice(0, 5).forEach(error => {
        const timeAgo = moment(error.timestamp).fromNow();
        console.log(`  - ${timeAgo}: ${error.body}`);
      });
    }
    
    // Check 5: Cron job health
    console.log('\n🏥 CRON JOB HEALTH');
    console.log('------------------');
    
    // Check if there are any recent system messages indicating cron activity
    const recentSystemMessages = await Message.find({
      from: 'system',
      timestamp: { $gte: since }
    }).sort({ timestamp: -1 });
    
    const cronActivity = recentSystemMessages.filter(msg => 
      msg.body.includes('reminder') || msg.body.includes('cron')
    );
    
    console.log(`Cron activity logs in last 24h: ${cronActivity.length}`);
    
    if (cronActivity.length > 0) {
      console.log('\nRecent cron activity:');
      cronActivity.slice(0, 5).forEach(activity => {
        const timeAgo = moment(activity.timestamp).fromNow();
        console.log(`  - ${timeAgo}: ${activity.body}`);
      });
    }
    
    // Overall status assessment
    console.log('\n📋 OVERALL STATUS ASSESSMENT');
    console.log('----------------------------');
    
    const hasRecentActivity = recentReminders.length > 0;
    const hasErrors = recentErrors.length > 0;
    const hasCronActivity = cronActivity.length > 0;
    const hasEligibleVendors = eligibleVendors.length > 0;
    
    console.log(`✅ Recent reminder activity: ${hasRecentActivity ? 'YES' : 'NO'}`);
    console.log(`✅ Cron job activity: ${hasCronActivity ? 'YES' : 'NO'}`);
    console.log(`✅ Eligible vendors found: ${hasEligibleVendors ? 'YES' : 'NO'}`);
    console.log(`⚠️  System errors: ${hasErrors ? 'YES' : 'NO'}`);
    
    if (!hasRecentActivity && hasEligibleVendors) {
      console.log('\n🚨 ALERT: No recent reminders despite eligible vendors!');
      console.log('Possible issues:');
      console.log('  - Cron job not running');
      console.log('  - Twilio credentials issue');
      console.log('  - Time window mismatch');
      console.log('  - Database connection issue');
    }
    
    if (hasErrors) {
      console.log('\n🚨 ALERT: System errors detected!');
      console.log('Check error logs above for details.');
    }
    
    console.log('\n✅ Cron status monitoring completed!');
    
  } catch (error) {
    console.error('❌ Error monitoring cron status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

monitorCronStatus();
