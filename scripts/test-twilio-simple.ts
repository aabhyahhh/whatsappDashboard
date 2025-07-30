import twilio from 'twilio';
import 'dotenv/config';

async function testTwilioConnection() {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
        
        console.log('🔍 Testing Twilio connection...');
        console.log('Account SID:', accountSid?.substring(0, 10) + '...');
        console.log('Auth Token:', authToken?.substring(0, 10) + '...');
        console.log('Phone Number:', twilioNumber);
        
        if (!accountSid || !authToken || !twilioNumber) {
            console.error('❌ Missing Twilio credentials');
            return;
        }

        const client = twilio(accountSid, authToken);
        
        // Test 1: Try to fetch account info
        console.log('\n📡 Test 1: Fetching account info...');
        try {
            const account = await client.api.accounts(accountSid).fetch();
            console.log('✅ Account info retrieved successfully');
            console.log('Account Status:', account.status);
            console.log('Account Type:', account.type);
        } catch (error: any) {
            console.error('❌ Failed to fetch account info:', error.message);
            console.error('Error code:', error.code);
            return;
        }
        
        // Test 2: Try to list phone numbers
        console.log('\n📡 Test 2: Listing phone numbers...');
        try {
            const phoneNumbers = await client.incomingPhoneNumbers.list({limit: 5});
            console.log('✅ Phone numbers retrieved successfully');
            console.log('Found', phoneNumbers.length, 'phone numbers');
            phoneNumbers.forEach(num => {
                console.log('-', num.phoneNumber, `(${num.friendlyName})`);
            });
        } catch (error: any) {
            console.error('❌ Failed to list phone numbers:', error.message);
        }
        
        // Test 3: Try to send a simple SMS (not WhatsApp)
        console.log('\n📡 Test 3: Testing SMS capability...');
        try {
            const message = await client.messages.create({
                from: twilioNumber,
                to: '+918130026321',
                body: 'Test message from Twilio API'
            });
            console.log('✅ SMS sent successfully');
            console.log('Message SID:', message.sid);
        } catch (error: any) {
            console.error('❌ Failed to send SMS:', error.message);
            console.error('Error code:', error.code);
        }
        
    } catch (error) {
        console.error('❌ Error testing Twilio connection:', error);
    }
}

testTwilioConnection(); 