import 'dotenv/config';
import { User } from './models/User.js';
import { sendTemplateMessage } from './meta.js';
import { connectDB } from './db.js';

async function sendWelcomeMessage(contactNumber, vendorName = null) {
  try {
    console.log(`📤 Sending welcome message to ${vendorName || contactNumber} (${contactNumber})...`);
    
    const result = await sendTemplateMessage(contactNumber, 'welcome_message_for_onboarding_util');
    
    if (result) {
      console.log(`✅ Welcome message sent successfully to ${contactNumber}`);
      return true;
    } else {
      console.error(`❌ Failed to send welcome message to ${contactNumber}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error sending welcome message to ${contactNumber}:`, error);
    return false;
  }
}

async function sendWelcomeToAllNewVendors() {
  try {
    await connectDB();
    
    // Get all users who were created in the last 24 hours and haven't received a welcome message
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const newVendors = await User.find({
      createdAt: { $gte: oneDayAgo },
      contactNumber: { $exists: true, $ne: null, $ne: '' },
      welcomeMessageSent: { $ne: true }
    }).select('name contactNumber createdAt').lean();
    
    console.log(`📊 Found ${newVendors.length} new vendors to send welcome messages to`);
    
    if (newVendors.length === 0) {
      console.log('ℹ️ No new vendors found to send welcome messages to');
      return;
    }
    
    let sentCount = 0;
    let errorCount = 0;
    
    for (const vendor of newVendors) {
      try {
        const sent = await sendWelcomeMessage(vendor.contactNumber, vendor.name);
        
        if (sent) {
          // Mark welcome message as sent
          await User.findByIdAndUpdate(vendor._id, {
            welcomeMessageSent: true,
            welcomeMessageSentAt: new Date()
          });
          
          sentCount++;
        } else {
          errorCount++;
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing vendor ${vendor.contactNumber}:`, error);
        errorCount++;
      }
    }
    
    console.log(`📊 Welcome message summary: ${sentCount} sent, ${errorCount} errors`);
    
  } catch (error) {
    console.error('❌ Error in sendWelcomeToAllNewVendors:', error);
  }
}

// If called directly, run the function
if (import.meta.url === `file://${process.argv[1]}`) {
  sendWelcomeToAllNewVendors()
    .then(() => {
      console.log('✅ Welcome message process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

export { sendWelcomeMessage, sendWelcomeToAllNewVendors };

