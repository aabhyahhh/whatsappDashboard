import 'dotenv/config';
import { sendTemplateMessage } from '../server/meta.js';

async function sendInactiveTemplateToTestVendor() {
  try {
    console.log('📞 Sending inactive vendors template to test vendor...');
    
    const testVendorPhone = '+918130026321';
    const templateName = 'inactive_vendors_support_prompt_util';
    
    console.log(`📤 Sending template "${templateName}" to ${testVendorPhone}...`);
    
    const result = await sendTemplateMessage(testVendorPhone, templateName);
    
    if (result) {
      console.log(`✅ Successfully sent inactive vendors template to ${testVendorPhone}`);
      console.log('📱 Response:', JSON.stringify(result, null, 2));
    } else {
      console.error(`❌ Failed to send template to ${testVendorPhone}`);
    }
    
  } catch (error) {
    console.error('❌ Error sending inactive template to test vendor:', error);
  }
}

// Run the function
sendInactiveTemplateToTestVendor()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
