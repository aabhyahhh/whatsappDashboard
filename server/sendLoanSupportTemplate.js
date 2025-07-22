import 'dotenv/config';
import { client } from './twilio.js';
import { User } from './models/User.js';

const TEMPLATE_SID = 'HXf4635b59c1abf466a77814b40dc1c362';

async function sendTemplateToAllVendors() {
  const { connectDB } = await import('./db.cjs');
  await connectDB();
  
  const users = await User.find({});
  console.log(`Found ${users.length} users to message.`);
  
  let sent = 0, failed = 0;
  for (const user of users) {
    const contact = user.contactNumber;
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
      console.log(`✅ Sent template to ${contact}`);
    } catch (err) {
      failed++;
      console.error(`❌ Failed to send to ${contact}:`, err.message || err);
    }
  }
  console.log(`Done. Sent: ${sent}, Failed: ${failed}`);
  process.exit(0);
}

sendTemplateToAllVendors().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 