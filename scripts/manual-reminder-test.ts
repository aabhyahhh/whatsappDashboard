import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import { Contact } from '../server/models/Contact.js';
import { client } from '../server/twilio.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Templates
const DAILY_REMINDER_TEMPLATE = 'HXbdb716843483717790c45c951b71701e';
const SUPPORT_REMINDER_TEMPLATE = 'HX4c78928e13eda15597c00ea0915f1f77';

async function sendTestReminders() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    if (!client) {
      console.error('❌ Twilio client not available');
      return;
    }
    
    console.log('\n🧪 MANUAL REMINDER TEST');
    console.log('========================');
    
    // Test 1: Send daily reminder to a few vendors
    console.log('\n📤 Testing daily vendor reminders...');
    const testVendors = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $ne: null },
      'operatingHours.openTime': { $exists: true, $ne: null }
    }).limit(3);
    
    console.log(`📊 Sending daily reminders to ${testVendors.length} test vendors`);
    
    for (const vendor of testVendors) {
      try {
        await client.messages.create({
          from: `whatsapp:${TWILIO_NUMBER}`,
          to: `whatsapp:${vendor.contactNumber}`,
          contentSid: DAILY_REMINDER_TEMPLATE,
          contentVariables: JSON.stringify({})
        });
        console.log(`✅ Sent daily reminder to ${vendor.name} (${vendor.contactNumber})`);
      } catch (error) {
        console.error(`❌ Failed to send daily reminder to ${vendor.contactNumber}:`, error.message);
      }
    }
    
    // Test 2: Send support reminder to inactive vendors
    console.log('\n📤 Testing support call reminders...');
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const inactiveContacts = await Contact.find({ lastSeen: { $lte: threeDaysAgo } }).limit(3);
    
    console.log(`📊 Sending support reminders to ${inactiveContacts.length} inactive contacts`);
    
    for (const contact of inactiveContacts) {
      // Check if this contact is a registered vendor
      const vendor = await User.findOne({ contactNumber: contact.phone });
      const vendorName = vendor ? vendor.name : null;
      
      try {
        await client.messages.create({
          from: `whatsapp:${TWILIO_NUMBER}`,
          to: `whatsapp:${contact.phone}`,
          contentSid: SUPPORT_REMINDER_TEMPLATE,
          contentVariables: JSON.stringify({})
        });
        console.log(`✅ Sent support reminder to ${vendorName || contact.phone} (${contact.phone})`);
        
        // Log the reminder
        await SupportCallReminderLog.create({ 
          contactNumber: contact.phone,
          sentAt: new Date()
        });
      } catch (error) {
        console.error(`❌ Failed to send support reminder to ${contact.phone}:`, error.message);
      }
    }
    
    console.log('\n✅ Manual reminder test completed!');
    console.log('\n📝 SUMMARY:');
    console.log(`- Daily reminders: ${testVendors.length} vendors tested`);
    console.log(`- Support reminders: ${inactiveContacts.length} inactive contacts tested`);
    console.log('- Check WhatsApp for received messages');
    
  } catch (error) {
    console.error('❌ Error in manual reminder test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

sendTestReminders(); 