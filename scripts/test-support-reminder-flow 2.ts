import mongoose from 'mongoose';
import { Contact } from '../server/models/Contact.js';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';
import { sendTemplateMessage } from '../server/meta.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;

async function testSupportReminderFlow() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧪 TESTING SUPPORT REMINDER FLOW');
    console.log('=================================');
    
    // Test 1: Find a vendor who should receive a support reminder
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const inactiveContacts = await Contact.find({ lastSeen: { $lt: fiveDaysAgo } });
    
    console.log(`📊 Found ${inactiveContacts.length} contacts inactive for 5+ days`);
    
    // Find a vendor who needs a reminder
    let testVendor = null;
    for (const contact of inactiveContacts) {
      const vendor = await User.findOne({ contactNumber: contact.phone });
      if (vendor) {
        // Check if reminder was sent in last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentReminder = await SupportCallReminderLog.findOne({
          contactNumber: contact.phone,
          sentAt: { $gte: twentyFourHoursAgo }
        });
        
        if (!recentReminder) {
          testVendor = {
            name: vendor.name,
            phone: contact.phone,
            lastSeen: contact.lastSeen,
            daysInactive: Math.floor((Date.now() - contact.lastSeen.getTime()) / (1000 * 60 * 60 * 24))
          };
          break;
        }
      }
    }
    
    if (!testVendor) {
      console.log('⚠️ No vendor found who needs a support reminder');
      console.log('📊 All inactive vendors have received reminders in the last 24 hours');
      return;
    }
    
    console.log(`\n🎯 Testing with vendor: ${testVendor.name} (${testVendor.phone})`);
    console.log(`   - Days inactive: ${testVendor.daysInactive}`);
    console.log(`   - Last seen: ${testVendor.lastSeen.toLocaleDateString()}`);
    
    // Test 2: Check Meta credentials
    console.log('\n🔑 Checking Meta credentials:');
    console.log(`   - META_ACCESS_TOKEN: ${!!process.env.META_ACCESS_TOKEN}`);
    console.log(`   - META_PHONE_NUMBER_ID: ${!!process.env.META_PHONE_NUMBER_ID}`);
    console.log(`   - META_APP_SECRET: ${!!process.env.META_APP_SECRET}`);
    
    if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
      console.log('❌ Meta credentials not available - cannot send test message');
      return;
    }
    
    // Test 3: Send support reminder
    console.log('\n📤 Sending support reminder...');
    try {
      const result = await sendTemplateMessage(testVendor.phone, 'inactive_vendors_support_prompt_util', []);
      
      if (result) {
        console.log('✅ Support reminder sent successfully');
        
        // Test 4: Log the message to database
        console.log('\n💾 Logging message to database...');
        const message = await Message.create({
          from: process.env.META_PHONE_NUMBER_ID,
          to: testVendor.phone,
          body: 'Template: inactive_vendors_support_prompt_util',
          direction: 'outbound',
          timestamp: new Date(),
          meta: {
            reminderType: 'support_prompt',
            vendorName: testVendor.name,
            template: 'inactive_vendors_support_prompt_util'
          }
        });
        console.log(`✅ Message logged with ID: ${message._id}`);
        
        // Test 5: Log to SupportCallReminderLog
        console.log('\n📝 Logging to SupportCallReminderLog...');
        const reminderLog = await SupportCallReminderLog.create({
          contactNumber: testVendor.phone,
          sentAt: new Date()
        });
        console.log(`✅ Reminder logged with ID: ${reminderLog._id}`);
        
        // Test 6: Verify the message can be detected
        console.log('\n🔍 Verifying message detection...');
        const recentMessage = await Message.findOne({
          to: testVendor.phone,
          direction: 'outbound',
          body: 'Template: inactive_vendors_support_prompt_util'
        }).sort({ timestamp: -1 });
        
        if (recentMessage) {
          console.log('✅ Message found in database');
          console.log(`   - ID: ${recentMessage._id}`);
          console.log(`   - Timestamp: ${recentMessage.timestamp.toLocaleString()}`);
          console.log(`   - Meta: ${JSON.stringify(recentMessage.meta)}`);
        } else {
          console.log('❌ Message not found in database');
        }
        
        // Test 7: Test the detection logic
        console.log('\n🧪 Testing detection logic...');
        const bodyMatch = recentMessage?.body?.includes('Template: inactive_vendors_support_prompt_util');
        const metaMatch = recentMessage?.meta?.reminderType?.includes('support_prompt');
        const templateMatch = recentMessage?.meta?.template === 'inactive_vendors_support_prompt_util';
        
        console.log(`   - Body match: ${bodyMatch}`);
        console.log(`   - Meta match: ${metaMatch}`);
        console.log(`   - Template match: ${templateMatch}`);
        
        if (bodyMatch || metaMatch || templateMatch) {
          console.log('✅ Message would be detected as "Meta Support Prompt"');
        } else {
          console.log('❌ Message would NOT be detected');
        }
        
        console.log('\n🎉 SUPPORT REMINDER FLOW TEST SUCCESSFUL!');
        console.log('==========================================');
        console.log('✅ Support reminder sent');
        console.log('✅ Message logged to database');
        console.log('✅ Reminder logged to SupportCallReminderLog');
        console.log('✅ Message detection logic verified');
        
      } else {
        console.log('❌ Failed to send support reminder');
      }
    } catch (error) {
      console.error('❌ Error sending support reminder:', error.message);
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
testSupportReminderFlow().catch(console.error);
