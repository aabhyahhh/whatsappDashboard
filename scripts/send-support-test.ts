import 'dotenv/config';
import { sendTemplateMessage } from '../server/meta.js';

async function sendSupportTestMessage() {
    try {
        const phoneNumber = '+918130026321'; // Your test number
        
        console.log('📤 Sending support call test message to:', phoneNumber);
        console.log('🛠️ Using Meta WhatsApp API');
        console.log('📋 Using template: inactive_vendors_support_prompt_util');
        
        // Use the Meta template
        const result = await sendTemplateMessage(phoneNumber, 'inactive_vendors_support_prompt_util');
        
        if (result) {
            console.log('✅ Support test message sent successfully!');
            console.log('Message ID:', result.messages?.[0]?.id);
            console.log('📋 Next steps:');
            console.log('1. Reply "Yes" to trigger support call logging');
            console.log('2. Check the Support Calls page for the new entry');
            console.log('3. Try marking it as completed');
        } else {
            console.error('❌ Failed to send support test message');
        }
        
    } catch (error) {
        console.error('❌ Error sending support test message:', error);
    }
}

sendSupportTestMessage(); 