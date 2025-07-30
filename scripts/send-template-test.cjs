const twilio = require('twilio');
require('dotenv').config();

async function sendTemplateTestMessage() {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
        
        if (!accountSid || !authToken || !twilioNumber) {
            console.error('❌ Missing Twilio credentials');
            return;
        }

        const client = twilio(accountSid, authToken);
        const phoneNumber = '+918130026321';
        
        console.log('📤 Sending template test message to:', phoneNumber);
        console.log('Template ID: HX4c78928e13eda15597c00ea0915f1f77');
        
        const message = await client.messages.create({
            from: `whatsapp:${twilioNumber}`,
            to: `whatsapp:${phoneNumber}`,
            contentSid: 'HX4c78928e13eda15597c00ea0915f1f77',
            contentVariables: JSON.stringify({})
        });

        console.log('✅ Template message sent successfully!');
        console.log('Message SID:', message.sid);
        
    } catch (error) {
        console.error('❌ Error sending template message:', error);
    }
}

sendTemplateTestMessage(); 