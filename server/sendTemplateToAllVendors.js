import 'dotenv/config';
import { User } from './models/User.js';
import { sendTextMessage } from './meta.js';

const TEMPLATE_SID = 'HX5364d2f0c0cce7ac9e38673572a45d15';

async function sendTemplateToAllUsers() {
  const { connectDB } = await import('./db.cjs');
  await connectDB();
  const users = await User.find({});
  console.log(`Found ${users.length} users.`);
  let sent = 0, failed = 0;
  for (const user of users) {
    const contact = user.contactNumber;
    // Determine language
    let language = user.primaryLanguage;
    if (!language && Array.isArray(user.preferredLanguages) && user.preferredLanguages.length > 0) {
      language = user.preferredLanguages[0];
    }
    if (!language) language = 'English';
    if (!contact || typeof contact !== 'string' || contact.length < 10) {
      console.warn(`Skipping user with invalid contactNumber:`, user);
      continue;
    }
    try {
      // Check if Meta WhatsApp API credentials are available
      if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
        console.log('⚠️ Meta WhatsApp API credentials not available - skipping message');
        failed++;
        continue;
      }
      
      const messageText = `📸 Profile Photo Campaign Reminder\n\nHello! Don't forget to upload your profile photo to help customers recognize your stall.\n\nUpload your photo through the admin dashboard to participate in our campaign!\n\nBest regards,\nLaari Khojo Team`;
      
      await sendTextMessage(contact, messageText);
      sent++;
      console.log(`✅ Sent template to ${contact} [${language}] via Meta API`);
    } catch (err) {
      failed++;
      console.error(`❌ Failed to send to ${contact} [${language}]:`, err.message || err);
    }
  }
  console.log(`Done. Sent: ${sent}, Failed: ${failed}`);
  process.exit(0);
}

sendTemplateToAllUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 