import 'dotenv/config';
import { User } from '../server/models/User.js';
import { client } from '../server/twilio.js';
import { Message } from '../server/models/Message.js';

// Template ID for the profile photo announcement message
// You need to replace this with the actual approved template ID from Twilio
const TEMPLATE_SID = 'HX5364d2f0c0cce7ac9e38673572a45d15';

async function sendProfilePhotoAnnouncementNow() {
  try {
    // Connect to database
    const { connectDB } = await import('../server/db.cjs');
    await connectDB();
    
    console.log('🚀 Starting IMMEDIATE profile photo feature announcement...');
    console.log(`📅 Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log('⚠️ This will send the message to ALL vendors with WhatsApp consent RIGHT NOW!');
    
    // Find all users with WhatsApp consent
    const users = await User.find({ whatsappConsent: true });
    console.log(`📊 Found ${users.length} users with WhatsApp consent.`);
    
    if (users.length === 0) {
      console.log('❌ No users found with WhatsApp consent. Exiting.');
      process.exit(0);
    }
    
    // Ask for confirmation
    console.log('\n⚠️ Are you sure you want to send this message to ALL vendors now?');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    // Wait 5 seconds for confirmation
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    
    console.log('\n📤 Starting to send messages...\n');
    
    for (const user of users) {
      const contact = user.contactNumber;
      
      // Skip users without valid contact numbers
      if (!contact || typeof contact !== 'string' || contact.length < 10) {
        console.warn(`⚠️ Skipping user ${user._id} - invalid contact number: ${contact}`);
        skipped++;
        continue;
      }
      
      try {
        // Send WhatsApp message
        await client.messages.create({
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:${contact}`,
          contentSid: TEMPLATE_SID,
          contentVariables: JSON.stringify({}),
        });
        
        // Save message to database
        await Message.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: contact,
          body: TEMPLATE_SID,
          direction: 'outbound',
          timestamp: new Date(),
          meta: { 
            campaign: 'profile-photo-announcement-immediate',
            date: new Date().toISOString().split('T')[0]
          }
        });
        
        sent++;
        console.log(`✅ Sent to ${contact} (${user.name || 'Unknown'})`);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        failed++;
        console.error(`❌ Failed to send to ${contact}:`, err.message || err);
      }
    }
    
    console.log('\n📈 Summary:');
    console.log(`✅ Successfully sent: ${sent}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏩ Skipped: ${skipped}`);
    console.log(`📊 Total processed: ${sent + failed + skipped}`);
    
    if (failed > 0) {
      console.log(`\n⚠️ ${failed} messages failed to send. Check the logs above for details.`);
    }
    
    console.log('\n🎉 Profile photo announcement sent to all vendors!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the function
sendProfilePhotoAnnouncementNow().then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('💥 Script failed:', err);
  process.exit(1);
});
