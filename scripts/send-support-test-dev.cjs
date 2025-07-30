const twilio = require('twilio');
require('dotenv').config();

async function sendSupportTestMessage() {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
        
        if (!accountSid || !authToken || !twilioNumber) {
            console.error('❌ Missing Twilio credentials');
            console.log('Account SID:', accountSid ? 'SET' : 'NOT SET');
            console.log('Auth Token:', authToken ? 'SET' : 'NOT SET');
            console.log('Phone Number:', twilioNumber || 'NOT SET');
            return;
        }

        const client = twilio(accountSid, authToken);
        const phoneNumber = '+918130026321'; // Your test number
        
        console.log('📤 Sending support call test message to:', phoneNumber);
        console.log('🛠️ Using development backend webhook');
        
        const message = await client.messages.create({
            from: `whatsapp:${twilioNumber}`,
            to: `whatsapp:${phoneNumber}`,
            body: `🙏 Hello! We noticed you haven't updated your location for 3 days. नमस्ते! हमने देखा कि आपने पिछले 3 दिनों से अपनी लोकेशन अपडेट नहीं की है।

📌 Are you open these days? Just let us know. क्या आप इन दिनों खुल रहे हैं? कृपया हमें बताएं।

☎️ If you're facing any issue and would like to schedule a support call, reply "Yes". अगर कोई समस्या है और आप कॉल पर बात करना चाहते हैं, तो "Yes" लिखें।

⏰ A team member will call you within 24 hours. हमारी टीम 24 घंटों के अंदर आपसे संपर्क करेगी।

🙏 Stay connected so customers can always find you on Laari Khojo! जुड़े रहें ताकि ग्राहक आपको Laari Khojo पर आसानी से ढूंढ सकें !`
        });
        
        console.log('✅ Support test message sent successfully!');
        console.log('Message SID:', message.sid);
        console.log('📋 Next steps:');
        console.log('1. Reply "Yes" to trigger support call logging');
        console.log('2. Check the Support Calls page for the new entry');
        console.log('3. Try marking it as completed');
        
    } catch (error) {
        console.error('❌ Error sending support test message:', error);
    }
}

sendSupportTestMessage(); 