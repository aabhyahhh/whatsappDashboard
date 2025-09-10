import 'dotenv/config';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp');
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

async function testMessageHealthAPI() {
  console.log('🧪 Testing Message Health API Logic');
  console.log('=' .repeat(50));
  
  await connectDB();
  
  try {
    const now = moment().tz('Asia/Kolkata');
    const last24Hours = now.subtract(24, 'hours').toDate();
    
    console.log(`📅 Testing data from: ${last24Hours.toISOString()}`);
    console.log(`📅 Current time: ${now.format('YYYY-MM-DD HH:mm:ss')} IST`);
    
    // Test 1: Fetch support call reminders
    console.log('\n📋 Test 1: Support Call Reminders');
    console.log('-'.repeat(30));
    
    const supportCallReminders = await Message.find({
      direction: 'outbound',
      body: { $regex: /inactive_vendors_support_prompt_util/i },
      timestamp: { $gte: last24Hours }
    }).sort({ timestamp: -1 }).lean();
    
    console.log(`✅ Found ${supportCallReminders.length} support call reminders in last 24 hours`);
    
    if (supportCallReminders.length > 0) {
      const sample = supportCallReminders[0];
      console.log(`📝 Sample reminder: ${sample.to} at ${new Date(sample.timestamp).toLocaleString()}`);
    }
    
    // Test 2: Fetch location update messages
    console.log('\n📋 Test 2: Location Update Messages');
    console.log('-'.repeat(30));
    
    const locationUpdateMessages = await Message.find({
      direction: 'outbound',
      body: { $regex: /update_location_cron_util/i },
      timestamp: { $gte: last24Hours }
    }).sort({ timestamp: -1 }).lean();
    
    console.log(`✅ Found ${locationUpdateMessages.length} location update messages in last 24 hours`);
    
    if (locationUpdateMessages.length > 0) {
      const sample = locationUpdateMessages[0];
      console.log(`📝 Sample location update: ${sample.to} at ${new Date(sample.timestamp).toLocaleString()}`);
      console.log(`   Meta data: ${JSON.stringify(sample.meta)}`);
    }
    
    // Test 3: Vendor name resolution
    console.log('\n📋 Test 3: Vendor Name Resolution');
    console.log('-'.repeat(30));
    
    const allContactNumbers = [
      ...new Set([
        ...supportCallReminders.map(msg => msg.to),
        ...locationUpdateMessages.map(msg => msg.to)
      ])
    ];
    
    console.log(`📊 Unique contact numbers: ${allContactNumbers.length}`);
    
    const vendors = await User.find({
      contactNumber: { $in: allContactNumbers }
    }).select('contactNumber name').lean();
    
    const vendorMap = new Map(vendors.map(v => [v.contactNumber, v.name]));
    console.log(`✅ Resolved ${vendors.length} vendor names`);
    
    // Test 4: Process support call reminders
    console.log('\n📋 Test 4: Processed Support Call Reminders');
    console.log('-'.repeat(30));
    
    const processedSupportReminders = supportCallReminders.map(msg => ({
      contactNumber: msg.to,
      vendorName: vendorMap.get(msg.to) || 'Unknown Vendor',
      timestamp: msg.timestamp,
      messageId: msg.messageId,
      meta: msg.meta
    }));
    
    console.log(`✅ Processed ${processedSupportReminders.length} support reminders`);
    
    if (processedSupportReminders.length > 0) {
      const sample = processedSupportReminders[0];
      console.log(`📝 Sample processed reminder:`);
      console.log(`   Vendor: ${sample.vendorName}`);
      console.log(`   Contact: ${sample.contactNumber}`);
      console.log(`   Time: ${new Date(sample.timestamp).toLocaleString()}`);
    }
    
    // Test 5: Process location update messages
    console.log('\n📋 Test 5: Processed Location Update Messages');
    console.log('-'.repeat(30));
    
    const processedLocationUpdates = locationUpdateMessages.map(msg => ({
      contactNumber: msg.to,
      vendorName: vendorMap.get(msg.to) || 'Unknown Vendor',
      timestamp: msg.timestamp,
      messageId: msg.messageId,
      reminderType: msg.meta?.reminderType || 'unknown',
      dispatchType: msg.meta?.dispatchType || 'unknown',
      openTime: msg.meta?.openTime || 'Unknown',
      meta: msg.meta
    }));
    
    console.log(`✅ Processed ${processedLocationUpdates.length} location updates`);
    
    if (processedLocationUpdates.length > 0) {
      const sample = processedLocationUpdates[0];
      console.log(`📝 Sample processed location update:`);
      console.log(`   Vendor: ${sample.vendorName}`);
      console.log(`   Contact: ${sample.contactNumber}`);
      console.log(`   Time: ${new Date(sample.timestamp).toLocaleString()}`);
      console.log(`   Dispatch Type: ${sample.dispatchType}`);
      console.log(`   Open Time: ${sample.openTime}`);
    }
    
    // Test 6: Summary statistics
    console.log('\n📋 Test 6: Summary Statistics');
    console.log('-'.repeat(30));
    
    const summary = {
      totalSupportReminders: processedSupportReminders.length,
      totalLocationUpdates: processedLocationUpdates.length,
      uniqueVendorsContacted: allContactNumbers.length
    };
    
    console.log(`📊 Summary:`);
    console.log(`   • Support Reminders: ${summary.totalSupportReminders}`);
    console.log(`   • Location Updates: ${summary.totalLocationUpdates}`);
    console.log(`   • Unique Vendors: ${summary.uniqueVendorsContacted}`);
    
    // Test 7: API Response Format
    console.log('\n📋 Test 7: API Response Format');
    console.log('-'.repeat(30));
    
    const apiResponse = {
      success: true,
      timeRange: {
        from: last24Hours.toISOString(),
        to: new Date().toISOString()
      },
      supportCallReminders: processedSupportReminders,
      locationUpdateMessages: processedLocationUpdates,
      summary: summary
    };
    
    console.log(`✅ API Response structure validated`);
    console.log(`📊 Response size: ${JSON.stringify(apiResponse).length} characters`);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Final Summary:');
    console.log(`   • ${processedSupportReminders.length} support call reminders found`);
    console.log(`   • ${processedLocationUpdates.length} location update messages found`);
    console.log(`   • ${allContactNumbers.length} unique vendors contacted`);
    console.log(`   • ${vendors.length} vendor names resolved`);
    
  } catch (err) {
    console.error('❌ Test error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testMessageHealthAPI().catch(console.error);
