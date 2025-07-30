import mongoose from 'mongoose';
import { Contact } from '../server/models/Contact.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI_DEV;

async function testSupportReminder() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to database');
    
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    console.log('📅 Three days ago:', threeDaysAgo);
    
    // Find contacts not seen in 3+ days
    const inactiveContacts = await Contact.find({ lastSeen: { $lte: threeDaysAgo } });
    console.log(`📊 Found ${inactiveContacts.length} inactive contacts`);
    
    for (const contact of inactiveContacts) {
      console.log(`📱 Contact: ${contact.phone}, Last seen: ${contact.lastSeen}`);
      
      // Check if reminder already sent in last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const alreadySent = await SupportCallReminderLog.findOne({ 
        contactNumber: contact.phone, 
        sentAt: { $gte: since } 
      });
      
      if (alreadySent) {
        console.log(`⏩ Skipping ${contact.phone}, already sent in last 24h`);
      } else {
        console.log(`✅ Would send reminder to ${contact.phone}`);
      }
    }
    
    // Check SupportCallReminderLog collection
    const logs = await SupportCallReminderLog.find({}).sort({ sentAt: -1 }).limit(5);
    console.log(`📋 Recent reminder logs: ${logs.length}`);
    logs.forEach(log => {
      console.log(`  - ${log.contactNumber}: ${log.sentAt}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testSupportReminder(); 