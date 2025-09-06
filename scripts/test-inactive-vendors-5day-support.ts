import mongoose from 'mongoose';
import { Contact } from '../server/models/Contact.js';
import { User } from '../server/models/User.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';
import SupportCallLog from '../server/models/SupportCallLog.js';
import { sendTemplateMessage } from '../server/meta.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;

async function testInactiveVendors5DaySupport() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧪 TESTING INACTIVE VENDORS 5-DAY SUPPORT SYSTEM');
    console.log('================================================');
    
    // Test 1: Check inactive contacts (5+ days)
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const inactiveContacts = await Contact.find({ lastSeen: { $lt: fiveDaysAgo } });
    console.log(`📊 Found ${inactiveContacts.length} inactive contacts (not seen in 5+ days)`);
    
    // Test 2: Check which inactive contacts are registered vendors
    let inactiveVendors = 0;
    const vendorDetails = [];
    
    for (const contact of inactiveContacts) {
      const vendor = await User.findOne({ contactNumber: contact.phone });
      if (vendor) {
        inactiveVendors++;
        const daysInactive = Math.floor((Date.now() - contact.lastSeen.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check if reminder was sent in last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentReminder = await SupportCallReminderLog.findOne({
          contactNumber: contact.phone,
          sentAt: { $gte: twentyFourHoursAgo }
        });
        
        vendorDetails.push({
          name: vendor.name,
          phone: contact.phone,
          lastSeen: contact.lastSeen,
          daysInactive: daysInactive,
          reminderStatus: recentReminder ? 'Sent' : 'Not sent',
          reminderSentAt: recentReminder?.sentAt
        });
      }
    }
    
    console.log(`📊 Found ${inactiveVendors} inactive contacts who are registered vendors`);
    
    if (vendorDetails.length > 0) {
      console.log('\n📋 Inactive Vendor Details:');
      console.log('==========================');
      vendorDetails.slice(0, 10).forEach((vendor, index) => {
        console.log(`${index + 1}. ${vendor.name} (${vendor.phone})`);
        console.log(`   - Last seen: ${vendor.lastSeen.toLocaleDateString()}`);
        console.log(`   - Days inactive: ${vendor.daysInactive}`);
        console.log(`   - Reminder status: ${vendor.reminderStatus}`);
        if (vendor.reminderSentAt) {
          console.log(`   - Last reminder: ${vendor.reminderSentAt.toLocaleString()}`);
        }
        console.log('');
      });
      
      if (vendorDetails.length > 10) {
        console.log(`... and ${vendorDetails.length - 10} more inactive vendors`);
      }
    }
    
    // Test 3: Check recent support call logs
    const recentSupportCalls = await SupportCallLog.find({})
      .sort({ timestamp: -1 })
      .limit(10);
    
    console.log(`\n📞 Recent Support Call Logs (${recentSupportCalls.length}):`);
    console.log('==========================================');
    recentSupportCalls.forEach((log, index) => {
      console.log(`${index + 1}. ${log.vendorName} (${log.contactNumber})`);
      console.log(`   - Timestamp: ${log.timestamp.toLocaleString()}`);
      console.log(`   - Completed: ${log.completed ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Test 4: Check recent reminder logs
    const recentReminders = await SupportCallReminderLog.find({})
      .sort({ sentAt: -1 })
      .limit(10);
    
    console.log(`\n📱 Recent Support Reminder Logs (${recentReminders.length}):`);
    console.log('==============================================');
    recentReminders.forEach((log, index) => {
      console.log(`${index + 1}. ${log.contactNumber}`);
      console.log(`   - Sent at: ${log.sentAt.toLocaleString()}`);
      console.log('');
    });
    
    // Test 5: Test template sending (if credentials available)
    if (process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID) {
      console.log('\n🧪 Testing Template Sending:');
      console.log('============================');
      
      // Test inactive_vendors_support_prompt_util template
      console.log('Testing inactive_vendors_support_prompt_util template...');
      try {
        const testPhone = '+918130026321'; // Replace with a test number
        const result = await sendTemplateMessage(testPhone, 'inactive_vendors_support_prompt_util', []);
        if (result) {
          console.log('✅ inactive_vendors_support_prompt_util template sent successfully');
        } else {
          console.log('❌ Failed to send inactive_vendors_support_prompt_util template');
        }
      } catch (error) {
        console.log('❌ Error sending inactive_vendors_support_prompt_util template:', error.message);
      }
      
      // Test inactive_vendors_reply_to_yes_support_call_util template
      console.log('Testing inactive_vendors_reply_to_yes_support_call_util template...');
      try {
        const testPhone = '+918130026321'; // Replace with a test number
        const result = await sendTemplateMessage(testPhone, 'inactive_vendors_reply_to_yes_support_call_util', []);
        if (result) {
          console.log('✅ inactive_vendors_reply_to_yes_support_call_util template sent successfully');
        } else {
          console.log('❌ Failed to send inactive_vendors_reply_to_yes_support_call_util template');
        }
      } catch (error) {
        console.log('❌ Error sending inactive_vendors_reply_to_yes_support_call_util template:', error.message);
      }
    } else {
      console.log('\n⚠️ Meta WhatsApp credentials not available - skipping template tests');
    }
    
    // Test 6: Summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log('=====================');
    console.log(`- Total inactive contacts (5+ days): ${inactiveContacts.length}`);
    console.log(`- Inactive registered vendors: ${inactiveVendors}`);
    console.log(`- Recent support calls: ${recentSupportCalls.length}`);
    console.log(`- Recent reminders sent: ${recentReminders.length}`);
    
    // Test 7: Check for vendors who should receive reminders today
    const today = new Date();
    const vendorsNeedingReminders = vendorDetails.filter(vendor => {
      if (!vendor.reminderSentAt) return true; // Never sent
      const daysSinceLastReminder = Math.floor((today.getTime() - vendor.reminderSentAt.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceLastReminder >= 1; // 24+ hours ago
    });
    
    console.log(`\n📅 Vendors needing reminders today: ${vendorsNeedingReminders.length}`);
    if (vendorsNeedingReminders.length > 0) {
      console.log('Vendors who should receive support prompts:');
      vendorsNeedingReminders.slice(0, 5).forEach((vendor, index) => {
        console.log(`${index + 1}. ${vendor.name} (${vendor.phone}) - ${vendor.daysInactive} days inactive`);
      });
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the test
testInactiveVendors5DaySupport().catch(console.error);
