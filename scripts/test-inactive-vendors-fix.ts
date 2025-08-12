import mongoose from 'mongoose';
import { Contact } from '../server/models/Contact.js';
import { User } from '../server/models/User.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;

async function testInactiveVendorsFix() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧪 TESTING INACTIVE VENDORS FIX');
    console.log('==================================');
    
    // Test 1: Check inactive contacts
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const inactiveContacts = await Contact.find({ lastSeen: { $lt: threeDaysAgo } });
    console.log(`📊 Found ${inactiveContacts.length} inactive contacts (not seen in 3+ days)`);
    
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
      console.log('\n📋 Sample inactive vendors:');
      vendorDetails.slice(0, 5).forEach(vendor => {
        console.log(`  - ${vendor.name} (${vendor.phone})`);
        console.log(`    Last seen: ${vendor.lastSeen}`);
        console.log(`    Days inactive: ${vendor.daysInactive}`);
        console.log(`    Reminder status: ${vendor.reminderStatus}`);
        if (vendor.reminderSentAt) {
          console.log(`    Reminder sent: ${vendor.reminderSentAt}`);
        }
        console.log('');
      });
    }
    
    // Test 3: Check SupportCallReminderLog collection
    const recentLogs = await SupportCallReminderLog.find({})
      .sort({ sentAt: -1 })
      .limit(5);
    
    console.log(`📊 Recent reminder logs: ${recentLogs.length} found`);
    if (recentLogs.length > 0) {
      console.log('\n📋 Recent reminder logs:');
      recentLogs.forEach(log => {
        console.log(`  - ${log.contactNumber} - ${log.sentAt}`);
      });
    }
    
    console.log('\n✅ Inactive vendors fix test completed!');
    console.log('\n📝 SUMMARY:');
    console.log(`- Total inactive contacts: ${inactiveContacts.length}`);
    console.log(`- Inactive vendors: ${inactiveVendors}`);
    console.log(`- Recent reminder logs: ${recentLogs.length}`);
    console.log('- The fix should now properly calculate days inactive and track reminder status');
    
  } catch (error) {
    console.error('❌ Error testing inactive vendors fix:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testInactiveVendorsFix();
