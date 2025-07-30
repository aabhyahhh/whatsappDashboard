import twilio from 'twilio';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function testTwilioManual() {
    try {
        console.log('🔍 Manual Twilio Test');
        console.log('Enter your Twilio credentials (or press Enter to use .env values)');
        
        let accountSid = await question('Account SID: ');
        let authToken = await question('Auth Token: ');
        let phoneNumber = await question('Phone Number: ');
        
        // If empty, use .env values
        if (!accountSid || !authToken || !phoneNumber) {
            console.log('Using .env values...');
            accountSid = process.env.TWILIO_ACCOUNT_SID || '';
            authToken = process.env.TWILIO_AUTH_TOKEN || '';
            phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
        }
        
        if (!accountSid || !authToken || !phoneNumber) {
            console.error('❌ Missing credentials');
            rl.close();
            return;
        }
        
        console.log('\n🔍 Testing with provided credentials...');
        const client = twilio(accountSid, authToken);
        
        try {
            const account = await client.api.accounts(accountSid).fetch();
            console.log('✅ Authentication successful!');
            console.log('Account Status:', account.status);
            console.log('Account Type:', account.type);
            
            // Try to send a test message
            console.log('\n📤 Sending test message...');
            const message = await client.messages.create({
                from: `whatsapp:${phoneNumber}`,
                to: 'whatsapp:+918130026321',
                body: 'Test message from Twilio API'
            });
            console.log('✅ Message sent successfully!');
            console.log('Message SID:', message.sid);
            
        } catch (error: any) {
            console.error('❌ Authentication failed:', error.message);
            console.error('Error code:', error.code);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        rl.close();
    }
}

testTwilioManual(); 