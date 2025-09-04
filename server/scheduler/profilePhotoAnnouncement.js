import schedule from 'node-schedule';
import { User } from '../models/User.js';
import { sendTextMessage } from '../meta.js';
import { Message } from '../models/Message.js';

// Template ID for the profile photo announcement message
const TEMPLATE_SID = 'HX5364d2f0c0cce7ac9e38673572a45d15'; // Replace with actual template ID

// Campaign start and end dates
const CAMPAIGN_START_DATE = new Date('2025-08-17'); // Today's date
const CAMPAIGN_END_DATE = new Date('2025-08-24'); // One week from start

async function sendProfilePhotoAnnouncement() {
  try {
    const today = new Date();
    
    // Check if we're within the campaign period
    if (today < CAMPAIGN_START_DATE || today > CAMPAIGN_END_DATE) {
      console.log(`📅 Campaign not active today. Campaign period: ${CAMPAIGN_START_DATE.toDateString()} to ${CAMPAIGN_END_DATE.toDateString()}`);
      return;
    }
    
    console.log('🚀 Starting daily profile photo feature announcement...');
    console.log(`📅 Date: ${today.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    
    // Find all users with WhatsApp consent
    const users = await User.find({ whatsappConsent: true });
    console.log(`📊 Found ${users.length} users with WhatsApp consent.`);
    
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const user of users) {
      const contact = user.contactNumber;
      
      // Skip users without valid contact numbers
      if (!contact || typeof contact !== 'string' || contact.length < 10) {
        console.warn(`⚠️ Skipping user ${user._id} - invalid contact number: ${contact}`);
        skipped++;
        continue;
      }
      
      // Check if message was already sent today to this user
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const existingMessage = await Message.findOne({
        to: contact,
        body: TEMPLATE_SID,
        timestamp: { $gte: todayStart, $lt: tomorrow }
      });
      
      if (existingMessage) {
        console.log(`⏩ Skipping ${contact} - message already sent today`);
        skipped++;
        continue;
      }
      
      try {
        // Check if Meta WhatsApp API credentials are available
        if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
          console.log('⚠️ Meta WhatsApp API credentials not available - skipping message');
          skipped++;
          continue;
        }
        
        // Send WhatsApp message via Meta API
        const messageText = `📸 Profile Photo Campaign Reminder\n\nHello! Don't forget to upload your profile photo to help customers recognize your stall.\n\nUpload your photo through the admin dashboard to participate in our campaign!\n\nBest regards,\nLaari Khojo Team`;
        
        await sendTextMessage(contact, messageText);
        
        // Save message to database
        await Message.create({
          from: process.env.META_PHONE_NUMBER_ID,
          to: contact,
          body: messageText,
          direction: 'outbound',
          timestamp: new Date(),
          meta: { 
            campaign: 'profile-photo-announcement',
            date: today.toISOString().split('T')[0],
            day: Math.floor((today - CAMPAIGN_START_DATE) / (1000 * 60 * 60 * 24)) + 1
          }
        });
        
        sent++;
        console.log(`✅ Sent profile photo announcement to ${contact} (${user.name || 'Unknown'})`);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        failed++;
        console.error(`❌ Failed to send to ${contact}:`, err.message || err);
      }
    }
    
    console.log('\n📈 Summary:');
    console.log(`✅ Successfully sent: ${sent}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏩ Skipped (already sent today): ${skipped}`);
    console.log(`📊 Total processed: ${sent + failed + skipped}`);
    
    if (failed > 0) {
      console.log(`\n⚠️ ${failed} messages failed to send. Check the logs above for details.`);
    }
    
    console.log('\n🎉 Daily profile photo announcement completed!');
    
  } catch (error) {
    console.error('💥 Error in profile photo announcement:', error);
  }
}

// Schedule the job to run every day at 9:00 AM IST (3:30 AM UTC)
// Format: 'minute hour day month day-of-week'
schedule.scheduleJob('0 9 * * *', sendProfilePhotoAnnouncement);

console.log('✅ Profile photo announcement scheduler started');
console.log(`📅 Campaign period: ${CAMPAIGN_START_DATE.toDateString()} to ${CAMPAIGN_END_DATE.toDateString()}`);
console.log('⏰ Will run daily at 9:00 AM IST');
