import 'dotenv/config';
import { User } from './models/User.js';
import { client } from './twilio.js';

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
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${contact}`,
        contentSid: TEMPLATE_SID,
        contentVariables: JSON.stringify({}),
      });
      sent++;
      console.log(`✅ Sent template to ${contact} [${language}]`);
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