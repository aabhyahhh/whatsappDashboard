#!/usr/bin/env tsx

/**
 * Test script for location update scheduler
 * This tests the logic for sending location update messages
 */

import { connectDB } from '../server/db.js';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';

async function testLocationScheduler() {
  try {
    console.log('🧪 Testing Location Update Scheduler Logic...');
    await connectDB();
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay();
    
    console.log(`📅 Current time: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`📅 Current day: ${currentDay} (0=Sunday, 1=Monday, etc.)`);
    console.log(`📅 Current time in minutes: ${currentTime}`);
    
    // Get vendors with operating hours
    const vendors = await User.find({ 
      contactNumber: { $exists: true, $nin: [null, ''] },
      operatingHours: { $exists: true, $ne: null }
    }).select('name contactNumber operatingHours').lean();
    
    console.log(`📊 Found ${vendors.length} vendors with operating hours`);
    
    let testCount = 0;
    let eligibleCount = 0;
    
    for (const vendor of vendors) {
      testCount++;
      if (testCount > 5) break; // Test only first 5 vendors
      
      console.log(`\n🔍 Testing vendor ${testCount}: ${vendor.name} (${vendor.contactNumber})`);
      
      if (!vendor.operatingHours) {
        console.log('  ❌ No operating hours');
        continue;
      }
      
      const operatingHours = vendor.operatingHours as any;
      console.log('  📋 Operating hours:', JSON.stringify(operatingHours, null, 2));
      
      if (!operatingHours.days || !operatingHours.days.includes(currentDay)) {
        console.log(`  ❌ Not open today (days: ${operatingHours.days}, today: ${currentDay})`);
        continue;
      }
      
      // Parse open time
      const openTimeStr = operatingHours.openTime;
      let openTimeMinutes: number;
      
      if (openTimeStr.includes('AM') || openTimeStr.includes('PM')) {
        const [time, period] = openTimeStr.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        let hour24 = hours;
        if (period === 'PM' && hours !== 12) hour24 += 12;
        if (period === 'AM' && hours === 12) hour24 = 0;
        openTimeMinutes = hour24 * 60 + minutes;
      } else {
        const [hours, minutes] = openTimeStr.split(':').map(Number);
        openTimeMinutes = hours * 60 + minutes;
      }
      
      const timeDiff = openTimeMinutes - currentTime;
      console.log(`  ⏰ Open time: ${openTimeStr} (${openTimeMinutes} minutes)`);
      console.log(`  ⏰ Time difference: ${timeDiff} minutes`);
      
      if (timeDiff === 15) {
        console.log('  ✅ Would send 15-minute reminder NOW');
        eligibleCount++;
      } else if (timeDiff === 0) {
        console.log('  ✅ Would send open-time reminder NOW');
        eligibleCount++;
      } else if (timeDiff > 0 && timeDiff < 60) {
        console.log(`  ⏳ Will send 15-minute reminder in ${timeDiff - 15} minutes`);
      } else if (timeDiff > 0) {
        console.log(`  ⏳ Will send 15-minute reminder in ${timeDiff - 15} minutes`);
      } else {
        console.log('  ❌ Already past open time');
      }
      
      // Check existing messages today
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const existingMessages = await Message.find({
        to: vendor.contactNumber,
        direction: 'outbound',
        'meta.type': 'location_update',
        timestamp: { $gte: todayStart, $lt: todayEnd }
      });
      
      console.log(`  📨 Existing location messages today: ${existingMessages.length}`);
      existingMessages.forEach(msg => {
        console.log(`    - ${msg.meta?.timeType} at ${msg.timestamp.toLocaleString()}`);
      });
      
      // Check if vendor sent location today
      const vendorLocationMessage = await Message.findOne({
        from: vendor.contactNumber,
        direction: 'inbound',
        location: { $exists: true },
        timestamp: { $gte: todayStart, $lt: todayEnd }
      });
      
      if (vendorLocationMessage) {
        console.log('  📍 Vendor already sent location today');
      } else {
        console.log('  📍 Vendor has not sent location today');
      }
    }
    
    console.log(`\n📊 Test Summary:`);
    console.log(`  - Tested ${testCount} vendors`);
    console.log(`  - ${eligibleCount} would receive messages right now`);
    console.log(`  - Scheduler runs every minute to check for eligible vendors`);
    
    console.log(`\n🔧 Scheduler Logic:`);
    console.log(`  1. Checks every minute for vendors opening in 15 minutes or at open time`);
    console.log(`  2. Only sends if vendor hasn't sent location today`);
    console.log(`  3. Sends 15-minute reminder first, then open-time reminder if no response`);
    console.log(`  4. Uses template: update_location_cron_util`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testLocationScheduler();
