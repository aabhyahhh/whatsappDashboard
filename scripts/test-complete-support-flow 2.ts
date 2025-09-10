import mongoose from 'mongoose';
import { Contact } from '../server/models/Contact.js';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';
import SupportCallLog from '../server/models/SupportCallLog.js';
import { sendTemplateMessage } from '../server/meta.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;

async function testCompleteSupportFlow() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧪 TESTING COMPLETE SUPPORT FLOW');
    console.log('=================================');
    
    // Test 1: Simulate the scheduler logic
    console.log('\n1️⃣ Testing Scheduler Logic (5+ days inactive):');
    console.log('===============================================');
    
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    console.log(`📅 Five days ago: ${fiveDaysAgo.toLocaleString()}`);
    
    // Find contacts inactive for 5+ days
    const inactiveContacts = await Contact.find({ lastSeen: { $lt: fiveDaysAgo } });
    console.log(`📊 Found ${inactiveContacts.length} contacts inactive for 5+ days`);
    
    // Check which are registered vendors
    let inactiveVendors = [];
    for (const contact of inactiveContacts) {
      const vendor = await User.findOne({ contactNumber: contact.phone });
      if (vendor) {
        const daysInactive = Math.floor((Date.now() - contact.lastSeen.getTime()) / (1000 * 60 * 60 * 24));
        inactiveVendors.push({
          name: vendor.name,
          phone: contact.phone,
          lastSeen: contact.lastSeen,
          daysInactive: daysInactive
        });
      }
    }
    
    console.log(`📊 Found ${inactiveVendors.length} inactive registered vendors`);
    
    // Check which vendors need reminders (no reminder in last 24 hours)
    const vendorsNeedingReminders = [];
    for (const vendor of inactiveVendors) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentReminder = await SupportCallReminderLog.findOne({
        contactNumber: vendor.phone,
        sentAt: { $gte: twentyFourHoursAgo }
      });
      
      if (!recentReminder) {
        vendorsNeedingReminders.push(vendor);
      }
    }
    
    console.log(`📊 Vendors needing reminders: ${vendorsNeedingReminders.length}`);
    
    if (vendorsNeedingReminders.length > 0) {
      console.log('\n📋 Vendors who should receive support prompts:');
      vendorsNeedingReminders.slice(0, 5).forEach((vendor, index) => {
        console.log(`${index + 1}. ${vendor.name} (${vendor.phone}) - ${vendor.daysInactive} days inactive`);
      });
    }
    
    // Test 2: Test template sending (if credentials available)
    console.log('\n2️⃣ Testing Template Sending:');
    console.log('============================');
    
    if (process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID) {
      console.log('✅ Meta credentials available - testing template sending');
      
      // Test with a sample vendor
      if (vendorsNeedingReminders.length > 0) {
        const testVendor = vendorsNeedingReminders[0];
        console.log(`\n🧪 Testing with vendor: ${testVendor.name} (${testVendor.phone})`);
        
        try {
          // Send support prompt
          console.log('📤 Sending inactive_vendors_support_prompt_util...');
          const promptResult = await sendTemplateMessage(testVendor.phone, 'inactive_vendors_support_prompt_util', []);
          
          if (promptResult) {
            console.log('✅ Support prompt sent successfully');
            
            // Log the reminder
            await SupportCallReminderLog.create({
              contactNumber: testVendor.phone,
              sentAt: new Date()
            });
            console.log('✅ Reminder logged to database');
            
            // Simulate a "yes" reply after a short delay
            console.log('\n⏳ Simulating "yes" reply in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Create a mock inbound "yes" message
            const mockYesMessage = new Message({
              from: testVendor.phone,
              to: process.env.META_PHONE_NUMBER_ID,
              body: 'yes',
              direction: 'inbound',
              timestamp: new Date(),
              meta: {
                type: 'text',
                testMessage: true
              }
            });
            await mockYesMessage.save();
            console.log('✅ Mock "yes" message created');
            
            // Create support call log
            await SupportCallLog.create({
              vendorName: testVendor.name,
              contactNumber: testVendor.phone,
              timestamp: new Date(),
              completed: false
            });
            console.log('✅ Support call log created');
            
            // Send confirmation
            console.log('📤 Sending inactive_vendors_reply_to_yes_support_call_util...');
            const confirmationResult = await sendTemplateMessage(testVendor.phone, 'inactive_vendors_reply_to_yes_support_call_util', []);
            
            if (confirmationResult) {
              console.log('✅ Support confirmation sent successfully');
              
              // Log the confirmation message
              await Message.create({
                from: process.env.META_PHONE_NUMBER_ID,
                to: testVendor.phone,
                body: 'Support request received! Our team will contact you soon.',
                direction: 'outbound',
                timestamp: new Date(),
                meta: {
                  type: 'support_confirmation',
                  template: 'inactive_vendors_reply_to_yes_support_call_util',
                  vendorName: testVendor.name,
                  testMessage: true
                }
              });
              console.log('✅ Confirmation message logged');
              
              console.log('\n🎉 COMPLETE FLOW TEST SUCCESSFUL!');
              console.log('=================================');
              console.log('✅ Support prompt sent');
              console.log('✅ Mock "yes" reply created');
              console.log('✅ Support call logged');
              console.log('✅ Confirmation sent');
              console.log('✅ All messages logged to database');
              
            } else {
              console.log('❌ Failed to send support confirmation');
            }
          } else {
            console.log('❌ Failed to send support prompt');
          }
        } catch (error) {
          console.error('❌ Error in template sending test:', error.message);
        }
      } else {
        console.log('⚠️ No vendors available for testing');
      }
    } else {
      console.log('⚠️ Meta credentials not available - skipping template tests');
      console.log('🔍 Credentials check:');
      console.log(`   - META_ACCESS_TOKEN: ${!!process.env.META_ACCESS_TOKEN}`);
      console.log(`   - META_PHONE_NUMBER_ID: ${!!process.env.META_PHONE_NUMBER_ID}`);
    }
    
    // Test 3: Verify database state
    console.log('\n3️⃣ Verifying Database State:');
    console.log('============================');
    
    const totalReminders = await SupportCallReminderLog.countDocuments();
    const totalSupportCalls = await SupportCallLog.countDocuments();
    const totalMessages = await Message.countDocuments();
    
    console.log(`📊 Database Statistics:`);
    console.log(`   - Total support reminders: ${totalReminders}`);
    console.log(`   - Total support calls: ${totalSupportCalls}`);
    console.log(`   - Total messages: ${totalMessages}`);
    
    // Test 4: Check recent activity
    console.log('\n4️⃣ Recent Activity Check:');
    console.log('=========================');
    
    const recentReminders = await SupportCallReminderLog.find({})
      .sort({ sentAt: -1 })
      .limit(5);
    
    const recentSupportCalls = await SupportCallLog.find({})
      .sort({ timestamp: -1 })
      .limit(5);
    
    console.log('📱 Recent reminders:');
    recentReminders.forEach((reminder, index) => {
      console.log(`   ${index + 1}. ${reminder.contactNumber} - ${reminder.sentAt.toLocaleString()}`);
    });
    
    console.log('\n📞 Recent support calls:');
    recentSupportCalls.forEach((call, index) => {
      console.log(`   ${index + 1}. ${call.vendorName} (${call.contactNumber}) - ${call.timestamp.toLocaleString()}`);
    });
    
    console.log('\n✅ Complete support flow test finished!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the test
testCompleteSupportFlow().catch(console.error);
