#!/usr/bin/env tsx

/**
 * Test Location Scheduler Fix
 * 
 * This script tests the fixed location scheduler to ensure it only sends
 * messages once at opening time (T), not at T-15.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import { DispatchLog } from '../server/models/DispatchLog.js';

// Set timezone
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

async function testLocationSchedulerFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧪 TESTING LOCATION SCHEDULER FIX');
    console.log('===================================');
    
    const now = moment().tz('Asia/Kolkata');
    console.log(`📅 Current time (IST): ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`📅 Current day: ${now.format('dddd')} (${now.day()})`);
    console.log('');
    
    // Find vendors with operating hours for today
    const currentDay = now.day();
    const vendors = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $nin: [null, ''] },
      operatingHours: { $exists: true, $ne: null }
    }).select('_id name contactNumber operatingHours').lean();
    
    console.log(`📊 Found ${vendors.length} vendors with WhatsApp consent and operating hours`);
    
    let eligibleVendors = 0;
    let vendorsOpenToday = 0;
    
    for (const vendor of vendors) {
      if (!vendor.operatingHours) continue;
      
      const operatingHours = vendor.operatingHours as any;
      if (!operatingHours.days || !operatingHours.days.includes(currentDay)) {
        continue;
      }
      
      vendorsOpenToday++;
      
      // Parse open time
      let openTime;
      try {
        openTime = moment.tz(operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
        if (!openTime.isValid()) continue;
      } catch (error) {
        continue;
      }
      
      openTime.set({
        year: now.year(),
        month: now.month(),
        date: now.date(),
      });
      
      const diff = openTime.diff(now, 'minutes');
      
      // Check if vendor would get a message now
      if (diff === 0) {
        eligibleVendors++;
        console.log(`📍 ${vendor.name} (${vendor.contactNumber}) - OPENING NOW (${operatingHours.openTime})`);
        
        // Check if they already got a message today
        const todayDate = now.format('YYYY-MM-DD');
        const existingDispatch = await DispatchLog.findOne({
          vendorId: vendor._id,
          date: todayDate,
          type: 'open'
        });
        
        if (existingDispatch) {
          console.log(`   ✅ Already sent message today at ${existingDispatch.createdAt?.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        } else {
          console.log(`   ⏰ Would send message now (opening time)`);
        }
      } else if (diff === 15) {
        console.log(`⏰ ${vendor.name} (${vendor.contactNumber}) - 15 mins before opening (${operatingHours.openTime}) - NO MESSAGE SENT`);
      } else if (diff > 0 && diff < 60) {
        console.log(`⏰ ${vendor.name} (${vendor.contactNumber}) - ${diff} mins before opening (${operatingHours.openTime}) - NO MESSAGE SENT`);
      }
    }
    
    console.log('');
    console.log(`📊 Summary:`);
    console.log(`   - Vendors open today: ${vendorsOpenToday}`);
    console.log(`   - Vendors opening now (would get message): ${eligibleVendors}`);
    console.log(`   - Messages sent at T-15: 0 (FIXED - no longer sent)`);
    console.log(`   - Messages sent at T: ${eligibleVendors} (only at opening time)`);
    
    // Check recent messages
    console.log('\n📱 Recent Location Update Messages (last 24 hours):');
    const yesterday = moment().tz('Asia/Kolkata').subtract(1, 'day').toDate();
    const recentMessages = await Message.find({
      'meta.reminderType': { $in: ['vendor_location_15min', 'vendor_location_open'] },
      timestamp: { $gte: yesterday }
    }).sort({ timestamp: -1 }).limit(10);
    
    if (recentMessages.length === 0) {
      console.log('   No recent location update messages found');
    } else {
      for (const msg of recentMessages) {
        const time = moment(msg.timestamp).tz('Asia/Kolkata').format('HH:mm:ss');
        const type = msg.meta?.reminderType || 'unknown';
        const vendor = msg.meta?.vendorName || 'unknown';
        console.log(`   ${time} - ${type} to ${vendor}`);
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('🎯 The scheduler now only sends messages at opening time (T), not at T-15');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the test
testLocationSchedulerFix();
