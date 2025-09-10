import 'dotenv/config';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import { sendTemplateMessage } from '../server/meta.ts';
import { connectDB } from '../server/db.ts';

async function sendLocationUpdateToAllVendors() {
  try {
    await connectDB();
    console.log('📍 Starting bulk location update send to all vendors via Meta...');
    
    // Get all users with valid contact numbers
    const allUsers = await User.find({ 
      contactNumber: { $exists: true, $nin: [null, ''] }
    }).select('name contactNumber _id').lean();
    
    // Filter out users with invalid phone numbers
    const validVendors = allUsers.filter(user => 
      user.contactNumber && 
      user.contactNumber.length >= 10 && 
      !user.contactNumber.includes('...') &&
      !(user.contactNumber.includes('+91') && user.contactNumber.length < 13)
    );
    
    console.log(`📊 Found ${validVendors.length} valid vendors to send location update to`);
    
    if (validVendors.length === 0) {
      console.log('ℹ️ No valid vendors found');
      return;
    }
    
    // Send location update messages to all vendors
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    for (const vendor of validVendors) {
      try {
        console.log(`📤 Sending location update to ${vendor.name} (${vendor.contactNumber})...`);
        
        const result = await sendTemplateMessage(vendor.contactNumber, 'update_location_cron_util');
        
        if (result && result.success) {
          // Log the message to database for tracking
          await Message.create({
            from: process.env.META_PHONE_NUMBER_ID,
            to: vendor.contactNumber,
            body: 'Template: update_location_cron_util',
            direction: 'outbound',
            timestamp: new Date(),
            meta: {
              reminderType: 'vendor_location_manual_test',
              vendorName: vendor.name,
              template: 'update_location_cron_util',
              success: true,
              messageId: result.messageId
            },
            messageId: result.messageId
          });
          
          console.log(`✅ Sent location update to ${vendor.name} (${vendor.contactNumber})`);
          successCount++;
        } else {
          throw new Error('Failed to send template message');
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        const errorMsg = `Failed to send location update to ${vendor.name} (${vendor.contactNumber}): ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`📊 Bulk location update send completed: ${successCount} successful, ${errorCount} failed`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.slice(0, 10).forEach(error => console.log(`  - ${error}`));
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in bulk location update send:', error);
  }
}

// Run the function
sendLocationUpdateToAllVendors()
  .then(() => {
    console.log('✅ Location update process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

