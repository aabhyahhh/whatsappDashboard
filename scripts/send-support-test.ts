import { client } from '../server/twilio.js';
import 'dotenv/config';

async function sendSupportTestMessage() {
    try {
        const phoneNumber = '+918130026321';
        const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
        
        if (!client) {
            console.error('❌ Twilio client not initialized');
            return;
        }

        if (!twilioNumber) {
            console.error('❌ TWILIO_PHONE_NUMBER not set');
            return;
        }

        console.log('📤 Sending support call test message to:', phoneNumber);
        
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
        
    } catch (error) {
        console.error('❌ Error sending support test message:', error);
    }
}

sendSupportTestMessage(); 