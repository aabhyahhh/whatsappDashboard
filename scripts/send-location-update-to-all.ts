import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import { DispatchLog } from '../server/models/DispatchLog.js';
import { sendTemplateMessage } from '../server/meta.js';

// Connect to MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';
await mongoose.connect(MONGO_URI);
console.log('✅ Connected to MongoDB');

// Check Meta credentials
function checkMetaCredentials() {
  console.log('\n🔍 Checking Meta WhatsApp API credentials:');
  console.log('META_ACCESS_TOKEN:', process.env.META_ACCESS_TOKEN ? '✅ Set' : '❌ Missing');
  console.log('META_PHONE_NUMBER_ID:', process.env.META_PHONE_NUMBER_ID ? '✅ Set' : '❌ Missing');
  console.log('META_API_VERSION:', process.env.META_API_VERSION || 'v19.0 (default)');
  
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.log('❌ Meta credentials are not configured!');
    return false;
  }
  return true;
}

// Send location update message to a single user
async function sendLocationUpdateToUser(user: any) {
  try {
    console.log(`📱 Sending location update to ${user.name} (${user.contactNumber})...`);
    
    const result = await sendTemplateMessage(user.contactNumber, 'update_location_cron_util');
    
    if (result && result.success) {
      // Save the message to database
      await Message.create({
        from: process.env.META_PHONE_NUMBER_ID,
        to: user.contactNumber,
        body: 'Template: update_location_cron_util',
        direction: 'outbound',
        timestamp: new Date(),
        meta: {
          reminderType: 'manual_location_update',
          vendorName: user.name,
          template: 'update_location_cron_util',
          success: true
        },
        messageId: result.messageId
      });
      
      console.log(`✅ Sent successfully to ${user.name} - ID: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } else {
      console.error(`❌ Failed to send to ${user.name}: ${result?.error || 'Unknown error'}`);
      return { success: false, error: result?.error || 'Unknown error' };
    }
  } catch (error: any) {
    console.error(`❌ Error sending to ${user.name}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Main function to send to all users
async function sendToAllUsers() {
  console.log('\n🚀 Starting bulk location update message sending...');
  
  // Check Meta credentials first
  if (!checkMetaCredentials()) {
    console.log('❌ Cannot proceed without Meta credentials');
    return;
  }
  
  try {
    // Get all users with WhatsApp consent and contact numbers
    const users = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $nin: [null, ''] }
    }).select('_id name contactNumber').lean();
    
    console.log(`\n📊 Found ${users.length} users with WhatsApp consent and contact numbers`);
    
    if (users.length === 0) {
      console.log('❌ No users found to send messages to');
      return;
    }
    
    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Send messages to all users
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n[${i + 1}/${users.length}] Processing ${user.name}...`);
      
      const result = await sendLocationUpdateToUser(user);
      
      if (result.success) {
        sentCount++;
      } else {
        errorCount++;
        errors.push(`${user.name} (${user.contactNumber}): ${result.error}`);
      }
      
      // Add a small delay to avoid rate limiting
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    // Summary
    console.log('\n📈 SUMMARY:');
    console.log(`✅ Successfully sent: ${sentCount}`);
    console.log(`❌ Failed to send: ${errorCount}`);
    console.log(`📊 Total processed: ${users.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n🎉 Bulk location update sending completed!');
    
  } catch (error) {
    console.error('❌ Error during bulk sending:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
sendToAllUsers();
