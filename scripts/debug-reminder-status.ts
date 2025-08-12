import mongoose from 'mongoose';
import { Contact } from '../server/models/Contact.js';
import { User } from '../server/models/User.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';
import path from 'path';
import dotenv from 'dotenv';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function debugReminderStatus() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔍 DEBUGGING REMINDER STATUS ISSUE');
    console.log('===================================');
    
    // Test 1: Check SupportCallReminderLog collection
    console.log('\n📊 Checking SupportCallReminderLog collection...');
    const totalLogs = await SupportCallReminderLog.countDocuments();
    console.log(`Total reminder logs: ${totalLogs}`);
    
    const recentLogs = await SupportCallReminderLog.find({})
      .sort({ sentAt: -1 })
      .limit(5);
    
    console.log('\n📋 Recent reminder logs:');
    recentLogs.forEach(log => {
      console.log(`- ${log.contactNumber} - ${log.sentAt}`);
    });
    
    // Test 2: Check a specific vendor
    const testPhone = '+918140242452'; // Kathiyawadi Bhajiya
    console.log(`\n🔍 Testing specific vendor: ${testPhone}`);
    
    const contact = await Contact.findOne({ phone: testPhone });
    if (contact) {
      console.log(`Contact found: ${contact.phone} - Last seen: ${contact.lastSeen}`);
      
      // Check if reminder was sent in last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentReminder = await SupportCallReminderLog.findOne({
        contactNumber: testPhone,
        sentAt: { $gte: twentyFourHoursAgo }
      });
      
      console.log(`24 hours ago: ${twentyFourHoursAgo}`);
      console.log(`Recent reminder found: ${!!recentReminder}`);
      if (recentReminder) {
        console.log(`Reminder sent at: ${recentReminder.sentAt}`);
      }
      
      // Check all reminders for this vendor
      const allReminders = await SupportCallReminderLog.find({
        contactNumber: testPhone
      }).sort({ sentAt: -1 });
      
      console.log(`Total reminders for this vendor: ${allReminders.length}`);
      if (allReminders.length > 0) {
        console.log('All reminders:');
        allReminders.forEach(reminder => {
          console.log(`  - ${reminder.sentAt}`);
        });
      }
    } else {
      console.log('Contact not found');
    }
    
    // Test 3: Simulate the exact logic from the API
    console.log('\n🧪 Simulating API logic...');
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const inactiveContacts = await Contact.find({
      lastSeen: { $lt: threeDaysAgo }
    }).sort({ lastSeen: -1 });
    
    console.log(`Inactive contacts found: ${inactiveContacts.length}`);
    
    for (const contact of inactiveContacts.slice(0, 3)) {
      const vendor = await User.findOne({ contactNumber: contact.phone });
      if (vendor) {
        console.log(`\n📱 Processing ${vendor.name} (${contact.phone})...`);
        
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentReminder = await SupportCallReminderLog.findOne({
          contactNumber: contact.phone,
          sentAt: { $gte: twentyFourHoursAgo }
        });
        
        console.log(`  - 24h ago: ${twentyFourHoursAgo}`);
        console.log(`  - Recent reminder found: ${!!recentReminder}`);
        console.log(`  - Reminder status: ${recentReminder ? 'Sent' : 'Not sent'}`);
        
        if (recentReminder) {
          console.log(`  - Reminder sent at: ${recentReminder.sentAt}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging reminder status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugReminderStatus();
