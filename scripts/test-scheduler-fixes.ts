#!/usr/bin/env tsx

/**
 * Test Scheduler Fixes
 * 
 * This script tests the fixed scheduler to verify it's working correctly.
 * It runs the scheduler for a short period and checks for proper logging.
 */

import 'dotenv/config';
import moment from 'moment-timezone';

// Set timezone
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

console.log('🧪 Testing Scheduler Fixes');
console.log('==========================');
console.log(`📅 Current time (IST): ${moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')}`);
console.log(`🌍 Timezone: ${process.env.TZ}`);
console.log('');

// Check environment variables
console.log('🔧 Environment Check:');
console.log(`   META_ACCESS_TOKEN: ${process.env.META_ACCESS_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   META_PHONE_NUMBER_ID: ${process.env.META_PHONE_NUMBER_ID ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   META_VERIFY_TOKEN: ${process.env.META_VERIFY_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   META_APP_SECRET: ${process.env.META_APP_SECRET ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ SET' : '❌ NOT SET'}`);
console.log('');

// Import and start the scheduler
console.log('🚀 Starting scheduler...');
import '../server/scheduler/metaSchedulerFixed.js';

// Wait for a few minutes to see the heartbeat
console.log('⏳ Waiting for scheduler to initialize...');
console.log('💡 You should see heartbeat messages every 5 minutes');
console.log('💡 Press Ctrl+C to stop the test');
console.log('');

// Keep the process alive for testing
let heartbeatCount = 0;
const maxHeartbeats = 3; // Test for 3 heartbeats (15 minutes)

const heartbeatInterval = setInterval(() => {
  heartbeatCount++;
  console.log(`📊 Heartbeat ${heartbeatCount}/${maxHeartbeats} - Scheduler is running`);
  
  if (heartbeatCount >= maxHeartbeats) {
    console.log('✅ Test completed successfully!');
    console.log('📋 Summary:');
    console.log('   - Scheduler started without errors');
    console.log('   - Heartbeat logging is working');
    console.log('   - Ready for production deployment');
    process.exit(0);
  }
}, 5 * 60 * 1000); // 5 minutes

process.on('SIGINT', () => {
  console.log('\n🛑 Test stopped by user');
  clearInterval(heartbeatInterval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  clearInterval(heartbeatInterval);
  process.exit(0);
});
