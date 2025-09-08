import 'dotenv/config';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { User } from '../server/models/User.js';
import { Contact } from '../server/models/Contact.js';
import { Message } from '../server/models/Message.js';
import { DispatchLog } from '../server/models/DispatchLog.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp');
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

async function testRefactoredCrons() {
  console.log('🧪 Testing Refactored Cron Implementation');
  console.log('=' .repeat(50));
  
  await connectDB();
  
  try {
    // Test 1: Check DispatchLog model
    console.log('\n📋 Test 1: DispatchLog Model');
    console.log('-'.repeat(30));
    
    const dispatchLogCount = await DispatchLog.countDocuments();
    console.log(`✅ DispatchLog model accessible - ${dispatchLogCount} records`);
    
    // Test 2: Check vendors with operating hours
    console.log('\n📋 Test 2: Vendors with Operating Hours');
    console.log('-'.repeat(30));
    
    const vendorsWithHours = await User.find({
      whatsappConsent: true,
      contactNumber: { $exists: true, $nin: [null, ''] },
      operatingHours: { $exists: true, $ne: null }
    }).select('name contactNumber operatingHours').lean();
    
    console.log(`✅ Found ${vendorsWithHours.length} vendors with operating hours and WhatsApp consent`);
    
    if (vendorsWithHours.length > 0) {
      const sampleVendor = vendorsWithHours[0];
      console.log(`📝 Sample vendor: ${sampleVendor.name} (${sampleVendor.contactNumber})`);
      console.log(`   Operating hours: ${JSON.stringify(sampleVendor.operatingHours)}`);
    }
    
    // Test 3: Check inactive vendors (5+ days)
    console.log('\n📋 Test 3: Inactive Vendors (5+ days)');
    console.log('-'.repeat(30));
    
    const fiveDaysAgo = moment().tz('Asia/Kolkata').subtract(5, 'days').startOf('day').toDate();
    const inactiveContacts = await Contact.find({ lastSeen: { $lte: fiveDaysAgo } });
    
    console.log(`✅ Found ${inactiveContacts.length} contacts inactive for 5+ days`);
    
    // Check how many are registered vendors
    let inactiveVendors = 0;
    for (const contact of inactiveContacts) {
      const vendor = await User.findOne({ contactNumber: contact.phone });
      if (vendor) inactiveVendors++;
    }
    
    console.log(`📊 ${inactiveVendors} of ${inactiveContacts.length} inactive contacts are registered vendors`);
    
    // Test 4: Check recent dispatch logs
    console.log('\n📋 Test 4: Recent Dispatch Logs');
    console.log('-'.repeat(30));
    
    const today = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    const todayDispatches = await DispatchLog.find({ date: today });
    
    console.log(`✅ Found ${todayDispatches.length} dispatches for today (${today})`);
    
    if (todayDispatches.length > 0) {
      const preOpenCount = todayDispatches.filter(d => d.type === 'preOpen').length;
      const openCount = todayDispatches.filter(d => d.type === 'open').length;
      console.log(`📊 PreOpen dispatches: ${preOpenCount}, Open dispatches: ${openCount}`);
    }
    
    // Test 5: Check recent support reminder logs
    console.log('\n📋 Test 5: Recent Support Reminder Logs');
    console.log('-'.repeat(30));
    
    const last24Hours = moment().tz('Asia/Kolkata').subtract(24, 'hours').toDate();
    const recentSupportReminders = await SupportCallReminderLog.find({
      sentAt: { $gte: last24Hours }
    });
    
    console.log(`✅ Found ${recentSupportReminders.length} support reminders sent in last 24 hours`);
    
    // Test 6: Check recent messages
    console.log('\n📋 Test 6: Recent Template Messages');
    console.log('-'.repeat(30));
    
    const recentLocationMessages = await Message.find({
      direction: 'outbound',
      body: { $regex: /update_location_cron_util/ },
      timestamp: { $gte: last24Hours }
    });
    
    const recentSupportMessages = await Message.find({
      direction: 'outbound',
      body: { $regex: /inactive_vendors_support_prompt_util/ },
      timestamp: { $gte: last24Hours }
    });
    
    console.log(`✅ Location update messages (24h): ${recentLocationMessages.length}`);
    console.log(`✅ Support prompt messages (24h): ${recentSupportMessages.length}`);
    
    // Test 7: Timezone and timing validation
    console.log('\n📋 Test 7: Timezone and Timing Validation');
    console.log('-'.repeat(30));
    
    const now = moment().tz('Asia/Kolkata');
    console.log(`✅ Current IST time: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`✅ Current day of week: ${now.day()} (0=Sunday, 1=Monday, etc.)`);
    
    // Check if any vendors would be opening soon
    let vendorsOpeningSoon = 0;
    for (const vendor of vendorsWithHours) {
      if (!vendor.operatingHours?.days?.includes(now.day())) continue;
      
      try {
        const openTime = moment.tz(vendor.operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
        if (openTime.isValid()) {
          openTime.set({
            year: now.year(),
            month: now.month(),
            date: now.date(),
          });
          
          const diff = openTime.diff(now, 'minutes');
          if (diff >= 0 && diff <= 30) { // Opening in next 30 minutes
            vendorsOpeningSoon++;
          }
        }
      } catch (err) {
        // Skip invalid times
      }
    }
    
    console.log(`📊 Vendors opening in next 30 minutes: ${vendorsOpeningSoon}`);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${vendorsWithHours.length} vendors ready for location updates`);
    console.log(`   • ${inactiveVendors} inactive vendors ready for support prompts`);
    console.log(`   • ${todayDispatches.length} dispatches logged today`);
    console.log(`   • ${recentSupportReminders.length} support reminders sent (24h)`);
    console.log(`   • ${vendorsOpeningSoon} vendors opening soon`);
    
  } catch (err) {
    console.error('❌ Test error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testRefactoredCrons().catch(console.error);
