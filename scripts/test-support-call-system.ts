import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import SupportCallLog from '../server/models/SupportCallLog.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testSupportCallSystem() {
  try {
    console.log('🧪 TESTING SUPPORT CALL SYSTEM');
    console.log('==============================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');
    
    // Test 1: Check inactive vendors
    console.log('\n🔍 Test 1: Checking inactive vendors...');
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    
    // Get a sample of users to check
    const sampleUsers = await User.find({}).limit(5);
    console.log(`📊 Found ${sampleUsers.length} sample users to check`);
    
    sampleUsers.forEach(user => {
      const lastActive = user.updatedAt || user.createdAt;
      const daysInactive = Math.floor((new Date().getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   - ${user.name} (${user.contactNumber}): ${daysInactive} days inactive`);
    });
    
    // Test 2: Check support call logs
    console.log('\n🔍 Test 2: Checking support call logs...');
    const supportCalls = await SupportCallLog.find({}).sort({ timestamp: -1 }).limit(10);
    console.log(`📊 Found ${supportCalls.length} support call logs`);
    
    supportCalls.forEach(call => {
      console.log(`   - ${call.vendorName} (${call.contactNumber}): ${call.completed ? '✅ Completed' : '⏳ Pending'} - ${call.timestamp}`);
    });
    
    // Test 3: Check reminder logs
    console.log('\n🔍 Test 3: Checking reminder logs...');
    const reminderLogs = await SupportCallReminderLog.find({}).sort({ sentAt: -1 }).limit(10);
    console.log(`📊 Found ${reminderLogs.length} reminder logs`);
    
    reminderLogs.forEach(log => {
      console.log(`   - ${log.contactNumber}: sent at ${log.sentAt}`);
    });
    
    // Test 4: Simulate support request
    console.log('\n🔍 Test 4: Simulating support request...');
    const testPhone = '+918130026321';
    const testUser = await User.findOne({ contactNumber: testPhone });
    
    if (testUser) {
      console.log(`📞 Simulating support request from ${testUser.name} (${testPhone})`);
      
      // Check if support call already exists
      const existingCall = await SupportCallLog.findOne({ 
        contactNumber: testPhone,
        completed: false 
      });
      
      if (existingCall) {
        console.log(`⚠️  Support call already exists for ${testUser.name} (${testPhone})`);
        console.log(`   - Status: ${existingCall.completed ? 'Completed' : 'Pending'}`);
        console.log(`   - Created: ${existingCall.timestamp}`);
      } else {
        console.log(`✅ No existing support call found - ready for new request`);
      }
    } else {
      console.log(`❌ Test user not found: ${testPhone}`);
    }
    
    // Test 5: Check reminder frequency
    console.log('\n🔍 Test 5: Checking reminder frequency logic...');
    const testContact = '+918130026321';
    const lastReminder = await SupportCallReminderLog.findOne({ 
      contactNumber: testContact 
    }).sort({ sentAt: -1 });
    
    if (lastReminder) {
      const hoursSinceLastSent = Math.floor((new Date().getTime() - lastReminder.sentAt.getTime()) / (60 * 60 * 1000));
      const shouldSendToday = hoursSinceLastSent >= 24;
      
      console.log(`📅 Last reminder sent: ${lastReminder.sentAt}`);
      console.log(`⏰ Hours since last sent: ${hoursSinceLastSent}`);
      console.log(`📤 Should send today: ${shouldSendToday ? 'Yes' : 'No'}`);
    } else {
      console.log(`📤 No previous reminders found - should send today: Yes`);
    }
    
    // Test 6: Template IDs verification
    console.log('\n🔍 Test 6: Template IDs verification...');
    const templates = {
      'Support Call Reminder': 'HX4c78928e13eda15597c00ea0915f1f77',
      'Support Confirmation': 'HXd71a47a5df1f4c784fc2f8155bb349ca'
    };
    
    Object.entries(templates).forEach(([name, id]) => {
      console.log(`   - ${name}: ${id}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing support call system:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testSupportCallSystem();

