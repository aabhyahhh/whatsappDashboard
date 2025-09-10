import 'dotenv/config';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function analyzeMessageTimingAndDelivery() {
  try {
    await connectDB();
    
    const now = moment().tz('Asia/Kolkata');
    const todayStart = now.clone().startOf('day').toDate();
    const todayEnd = now.clone().endOf('day').toDate();
    
    console.log(`📅 Analysis for: ${now.format('YYYY-MM-DD')} (Today)`);
    console.log(`🕐 Current time: ${now.format('YYYY-MM-DD HH:mm:ss')} IST\n`);
    
    // ===== ANALYSIS 1: Message Timing Patterns =====
    console.log('🔍 ANALYSIS 1: Message Timing Patterns');
    console.log('=' .repeat(60));
    
    // Find all outbound messages today with location reminders
    const locationReminderMessages = await Message.find({
      direction: 'outbound',
      timestamp: { $gte: todayStart, $lt: todayEnd },
      $or: [
        { body: { $regex: /update_location_cron_util/i } },
        { 'meta.reminderType': { $regex: /vendor_location/i } }
      ]
    }).sort({ timestamp: 1 }); // Sort by time ascending
    
    console.log(`📤 Total location reminder messages sent today: ${locationReminderMessages.length}`);
    
    // Group messages by time
    const messagesByTime = {};
    locationReminderMessages.forEach(msg => {
      const timeKey = moment(msg.timestamp).tz('Asia/Kolkata').format('HH:mm');
      if (!messagesByTime[timeKey]) {
        messagesByTime[timeKey] = [];
      }
      messagesByTime[timeKey].push(msg);
    });
    
    console.log('\n📋 Messages sent by time:');
    Object.keys(messagesByTime).sort().forEach(time => {
      const count = messagesByTime[time].length;
      console.log(`   ${time} - ${count} messages`);
    });
    
    // ===== ANALYSIS 2: Vendor Operating Hours vs Message Timing =====
    console.log('\n\n🔍 ANALYSIS 2: Vendor Operating Hours Analysis');
    console.log('=' .repeat(60));
    
    // Get all vendors with operating hours
    const vendorsWithHours = await User.find({
      whatsappConsent: true,
      contactNumber: { $exists: true, $nin: [null, ''] },
      operatingHours: { $exists: true, $ne: null }
    }).select('name contactNumber operatingHours').lean();
    
    console.log(`👥 Total vendors with operating hours: ${vendorsWithHours.length}`);
    
    // Analyze operating hours distribution
    const operatingHoursDistribution = {};
    const currentDay = now.day(); // 0 = Sunday, 1 = Monday, etc.
    
    let vendorsOpenToday = 0;
    let vendorsWithValidTimes = 0;
    
    for (const vendor of vendorsWithHours) {
      if (!vendor.operatingHours) continue;
      
      const operatingHours = vendor.operatingHours as any;
      
      // Check if vendor is open today
      if (operatingHours.days && operatingHours.days.includes(currentDay)) {
        vendorsOpenToday++;
        
        // Parse open time
        try {
          const openTime = moment.tz(operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
          if (openTime.isValid()) {
            vendorsWithValidTimes++;
            const timeKey = openTime.format('HH:mm');
            if (!operatingHoursDistribution[timeKey]) {
              operatingHoursDistribution[timeKey] = 0;
            }
            operatingHoursDistribution[timeKey]++;
          }
        } catch (error) {
          // Skip invalid times
        }
      }
    }
    
    console.log(`📊 Vendors open today: ${vendorsOpenToday}`);
    console.log(`📊 Vendors with valid times: ${vendorsWithValidTimes}`);
    
    console.log('\n📋 Operating hours distribution (vendors open today):');
    Object.keys(operatingHoursDistribution).sort().forEach(time => {
      const count = operatingHoursDistribution[time];
      console.log(`   ${time} - ${count} vendors`);
    });
    
    // ===== ANALYSIS 3: Expected vs Actual Message Timing =====
    console.log('\n\n🔍 ANALYSIS 3: Expected vs Actual Message Timing');
    console.log('=' .repeat(60));
    
    // Calculate expected message times (15 minutes before and at opening time)
    const expectedMessageTimes = new Set();
    
    for (const vendor of vendorsWithHours) {
      if (!vendor.operatingHours) continue;
      
      const operatingHours = vendor.operatingHours as any;
      if (!operatingHours.days || !operatingHours.days.includes(currentDay)) continue;
      
      try {
        const openTime = moment.tz(operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
        if (openTime.isValid()) {
          // 15 minutes before opening
          const reminderTime = openTime.clone().subtract(15, 'minutes');
          expectedMessageTimes.add(reminderTime.format('HH:mm'));
          
          // At opening time
          expectedMessageTimes.add(openTime.format('HH:mm'));
        }
      } catch (error) {
        // Skip invalid times
      }
    }
    
    console.log(`📊 Expected message times (15min before + at opening): ${expectedMessageTimes.size} unique times`);
    console.log('\n📋 Expected message times:');
    Array.from(expectedMessageTimes).sort().forEach(time => {
      console.log(`   ${time}`);
    });
    
    console.log('\n📋 Actual message times:');
    Object.keys(messagesByTime).sort().forEach(time => {
      console.log(`   ${time} - ${messagesByTime[time].length} messages`);
    });
    
    // ===== ANALYSIS 4: Message Delivery Status =====
    console.log('\n\n🔍 ANALYSIS 4: Message Delivery Status');
    console.log('=' .repeat(60));
    
    // Check for delivery status in message metadata
    let deliveredCount = 0;
    let failedCount = 0;
    let unknownCount = 0;
    
    locationReminderMessages.forEach(msg => {
      if (msg.meta?.success === true) {
        deliveredCount++;
      } else if (msg.meta?.success === false) {
        failedCount++;
      } else {
        unknownCount++;
      }
    });
    
    console.log(`📤 Total messages sent: ${locationReminderMessages.length}`);
    console.log(`✅ Messages delivered: ${deliveredCount}`);
    console.log(`❌ Messages failed: ${failedCount}`);
    console.log(`❓ Delivery status unknown: ${unknownCount}`);
    
    // ===== ANALYSIS 5: Inactive Vendors Analysis =====
    console.log('\n\n🔍 ANALYSIS 5: Inactive Vendors Analysis');
    console.log('=' .repeat(60));
    
    // Find vendors who haven't sent messages in last 5 days
    const fiveDaysAgo = now.clone().subtract(5, 'days').startOf('day').toDate();
    
    const recentActiveVendors = await Message.find({
      direction: 'inbound',
      timestamp: { $gte: fiveDaysAgo }
    }).distinct('from');
    
    const recentActivePhoneNumbers = new Set(
      recentActiveVendors.map(phone => (phone || '').replace(/^whatsapp:/, ''))
    );
    
    // Find inactive vendors
    const inactiveVendors = vendorsWithHours.filter(vendor => 
      !recentActivePhoneNumbers.has(vendor.contactNumber)
    );
    
    console.log(`👥 Total vendors with operating hours: ${vendorsWithHours.length}`);
    console.log(`🎯 Vendors active in last 5 days: ${recentActivePhoneNumbers.size}`);
    console.log(`😴 Inactive vendors (no activity in 5+ days): ${inactiveVendors.length}`);
    
    // Check how many inactive vendors received messages today
    const inactiveVendorsWhoReceivedMessages = locationReminderMessages.filter(msg => 
      inactiveVendors.some(vendor => vendor.contactNumber === msg.to)
    );
    
    console.log(`📤 Inactive vendors who received messages today: ${inactiveVendorsWhoReceivedMessages.length}`);
    console.log(`📊 Percentage of inactive vendors who received messages: ${((inactiveVendorsWhoReceivedMessages.length / inactiveVendors.length) * 100).toFixed(2)}%`);
    
    // ===== ANALYSIS 6: Scheduler Performance =====
    console.log('\n\n🔍 ANALYSIS 6: Scheduler Performance Analysis');
    console.log('=' .repeat(60));
    
    // Check if scheduler is running every minute as expected
    const allOutboundToday = await Message.find({
      direction: 'outbound',
      timestamp: { $gte: todayStart, $lt: todayEnd }
    }).sort({ timestamp: 1 });
    
    // Group by minute
    const messagesByMinute = {};
    allOutboundToday.forEach(msg => {
      const minuteKey = moment(msg.timestamp).tz('Asia/Kolkata').format('HH:mm');
      if (!messagesByMinute[minuteKey]) {
        messagesByMinute[minuteKey] = 0;
      }
      messagesByMinute[minuteKey]++;
    });
    
    console.log(`📊 Total outbound messages today: ${allOutboundToday.length}`);
    console.log(`📊 Messages sent across ${Object.keys(messagesByMinute).length} different minutes`);
    
    console.log('\n📋 Message distribution by minute:');
    Object.keys(messagesByMinute).sort().forEach(minute => {
      const count = messagesByMinute[minute];
      console.log(`   ${minute} - ${count} messages`);
    });
    
    // ===== SUMMARY =====
    console.log('\n\n📋 SUMMARY');
    console.log('=' .repeat(60));
    console.log(`📅 Date: ${now.format('YYYY-MM-DD')}`);
    console.log(`👥 Total vendors: ${vendorsWithHours.length}`);
    console.log(`📊 Vendors open today: ${vendorsOpenToday}`);
    console.log(`📤 Location reminders sent: ${locationReminderMessages.length}`);
    console.log(`⏰ Message times: ${Object.keys(messagesByTime).join(', ')}`);
    console.log(`🎯 Expected message times: ${expectedMessageTimes.size} unique times`);
    console.log(`😴 Inactive vendors: ${inactiveVendors.length}`);
    console.log(`📤 Inactive vendors who received messages: ${inactiveVendorsWhoReceivedMessages.length}`);
    console.log(`✅ Messages delivered: ${deliveredCount}`);
    console.log(`❌ Messages failed: ${failedCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

analyzeMessageTimingAndDelivery();
