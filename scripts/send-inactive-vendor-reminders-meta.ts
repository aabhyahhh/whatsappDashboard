import 'dotenv/config';
import { User } from '../server/models/User.js';
import { Contact } from '../server/models/Contact.js';
import { sendTemplateMessage } from '../server/meta.js';
import { connectDB } from '../server/db.js';

async function sendInactiveVendorReminders() {
  try {
    await connectDB();
    console.log('📞 Starting inactive vendor reminder send via Meta...');
    
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    console.log(`📅 Three days ago: ${threeDaysAgo.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    
    // Find contacts not seen in 3+ days
    const inactiveContacts = await Contact.find({ lastSeen: { $lte: threeDaysAgo } });
    console.log(`📊 Found ${inactiveContacts.length} inactive contacts`);
    
    if (inactiveContacts.length === 0) {
      console.log('ℹ️ No inactive contacts found - all vendors are active!');
      return;
    }
    
    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const contact of inactiveContacts) {
      try {
        // Check if this contact is a registered vendor
        const vendor = await User.findOne({ contactNumber: contact.phone });
        const vendorName = vendor ? vendor.name : null;
        
        // Only send to registered vendors
        if (!vendor) {
          console.log(`⏩ Skipping ${contact.phone} - not a registered vendor`);
          skippedCount++;
          continue;
        }
        
        console.log(`📤 Sending support reminder to ${vendorName} (${contact.phone})...`);
        
        const result = await sendTemplateMessage(contact.phone, 'inactive_vendors_support_prompt');
        
        if (result) {
          console.log(`✅ Sent support reminder to ${vendorName} (${contact.phone})`);
          sentCount++;
        } else {
          throw new Error('Failed to send template message');
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        const errorMsg = `Failed to send reminder to ${contact.phone}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`📊 Support reminder summary: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.slice(0, 10).forEach(error => console.log(`  - ${error}`));
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in inactive vendor reminder send:', error);
  }
}

// Run the function
sendInactiveVendorReminders()
  .then(() => {
    console.log('✅ Inactive vendor reminder process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

