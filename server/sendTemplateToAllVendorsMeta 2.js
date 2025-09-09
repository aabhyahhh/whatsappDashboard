import 'dotenv/config';
import { User } from './models/User.js';
import { sendTemplateMessage } from './meta.js';
import { connectDB } from './db.js';

const TEMPLATE_NAME = 'default_hi_and_loan_prompt'; // Change this to the template you want to send

async function sendTemplateToAllVendors() {
  try {
    await connectDB();
    
    const users = await User.find({
      contactNumber: { $exists: true, $ne: null, $ne: '' }
    }).select('name contactNumber').lean();
    
    console.log(`📊 Found ${users.length} vendors to send template to.`);
    
    let sent = 0, failed = 0;
    
    for (const user of users) {
      const contact = user.contactNumber;
      
      // Skip users with invalid contact numbers
      if (!contact || typeof contact !== 'string' || contact.length < 10) {
        console.warn(`⏩ Skipping user with invalid contactNumber:`, user.name);
        continue;
      }
      
      try {
        const result = await sendTemplateMessage(contact, TEMPLATE_NAME);
        
        if (result) {
          sent++;
          console.log(`✅ Sent template to ${user.name} (${contact})`);
        } else {
          failed++;
          console.error(`❌ Failed to send to ${user.name} (${contact})`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        failed++;
        console.error(`❌ Error sending to ${user.name} (${contact}):`, err.message || err);
      }
    }
    
    console.log(`📊 Template send completed. Sent: ${sent}, Failed: ${failed}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// If called directly, run the function
if (import.meta.url === `file://${process.argv[1]}`) {
  sendTemplateToAllVendors()
    .then(() => {
      console.log('✅ Template send process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

export { sendTemplateToAllVendors };

