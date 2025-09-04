import 'dotenv/config';
import { sendTextMessage } from './meta.js';
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
      // Check if Meta WhatsApp API credentials are available
      if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
        console.log('⚠️ Meta WhatsApp API credentials not available - skipping message');
        failed++;
        continue;
      }
      
      const messageText = `🏦 Loan Support Available\n\nHello! We're here to help you with loan-related questions and support.\n\nIf you need assistance with loans or have any questions, please reply with "yes" or contact our support team.\n\nBest regards,\nLaari Khojo Support Team`;
      
      await sendTextMessage(contact, messageText);
      sent++;
      console.log(`✅ Sent template to ${contact} via Meta API`);
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