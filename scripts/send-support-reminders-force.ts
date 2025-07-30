import mongoose from 'mongoose';
import { Contact } from '../server/models/Contact.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';
import twilio from 'twilio';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI_DEV;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

async function sendSupportRemindersForce() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to development database');
    
    if (!accountSid || !authToken || !twilioNumber) {
      console.error('❌ Missing Twilio credentials');
      return;
    }

    const client = twilio(accountSid, authToken);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    console.log('📅 Three days ago:', threeDaysAgo);
    
    // Find contacts not seen in 3+ days
    const inactiveContacts = await Contact.find({ lastSeen: { $lte: threeDaysAgo } });
    console.log(`📊 Found ${inactiveContacts.length} inactive contacts`);
    
    let sentCount = 0;
    let failedCount = 0;
    
    console.log('\n🚀 Starting to send template HX4c78928e13eda15597c00ea0915f1f77 to all inactive vendors...');
    
    for (const contact of inactiveContacts) {
      console.log(`\n📱 Processing: ${contact.phone}, Last seen: ${contact.lastSeen}`);
      
      try {
        console.log(`📤 Sending template HX4c78928e13eda15597c00ea0915f1f77 to ${contact.phone}`);
        
        const message = await client.messages.create({
          from: `whatsapp:${twilioNumber}`,
          to: `whatsapp:${contact.phone}`,
          contentSid: 'HX4c78928e13eda15597c00ea0915f1f77',
          contentVariables: JSON.stringify({})
        });
        
        console.log(`✅ Message sent successfully! SID: ${message.sid}`);
        
        // Log the reminder (force send, don't check 24h restriction)
        await SupportCallReminderLog.create({
          contactNumber: contact.phone,
          sentAt: new Date()
        });
        
        sentCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        console.error(`❌ Failed to send to ${contact.phone}:`, error.message);
        failedCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Messages sent successfully: ${sentCount}`);
    console.log(`❌ Messages failed: ${failedCount}`);
    console.log(`📋 Total inactive contacts: ${inactiveContacts.length}`);
    
    console.log('\n📋 Next steps:');
    console.log('1. Vendors will receive template HX4c78928e13eda15597c00ea0915f1f77');
    console.log('2. When they reply "Yes", they will receive HXd71a47a5df1f4c784fc2f8155bb349ca');
    console.log('3. Support calls will be logged in the database');
    console.log('4. Check the Support Calls dashboard for new entries');
    
    // Check recent logs
    const logs = await SupportCallReminderLog.find({}).sort({ sentAt: -1 }).limit(5);
    console.log(`\n📋 Recent reminder logs: ${logs.length}`);
    logs.forEach(log => {
      console.log(`  - ${log.contactNumber}: ${log.sentAt}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

sendSupportRemindersForce(); 