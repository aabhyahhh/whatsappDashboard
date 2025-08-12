import path from 'path';
import dotenv from 'dotenv';
import { checkAndSendReminders } from '../server/vendorRemindersCron.js';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testVendorRemindersManual() {
  try {
    console.log('🧪 MANUAL TEST OF VENDOR REMINDER SYSTEM');
    console.log('=========================================');
    
    console.log('📱 TWILIO CREDENTIALS CHECK:');
    console.log('- Account SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
    console.log('- Auth Token:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('- Phone Number:', process.env.TWILIO_PHONE_NUMBER ? '✅ Set' : '❌ Missing');
    
    console.log('\n🚀 Triggering vendor reminder check...');
    
    // Call the reminder function directly
    await checkAndSendReminders();
    
    console.log('\n✅ Manual test completed!');
    
  } catch (error) {
    console.error('❌ Error in manual test:', error);
  }
}

testVendorRemindersManual();

