import 'dotenv/config';

async function testWebhookRealistic() {
    try {
        console.log('🧪 Testing webhook with realistic Twilio payload...');
        
        // Simulate the exact payload Twilio would send for a "Yes" response
        const webhookData = {
            Body: 'Yes',
            From: 'whatsapp:+918130026321',
            To: 'whatsapp:+15557897194',
            MessageSid: 'MM54f0265a1bf0c42ebdb8dcd12ea3d74e',
            AccountSid: process.env.TWILIO_ACCOUNT_SID,
            // Button payload for template response
            ButtonPayload: 'yes_support',
            ButtonText: 'Yes'
        };
        
        console.log('📡 Sending webhook payload:', webhookData);
        
        const response = await fetch('http://localhost:5000/api/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(webhookData)
        });
        
        console.log('📡 Webhook Response Status:', response.status);
        console.log('📡 Webhook Response:', await response.text());
        
        if (response.ok) {
            console.log('✅ Webhook test successful!');
            console.log('📋 Check the Support Calls page for the new entry');
            
            // Check if support call was logged
            setTimeout(async () => {
                const supportCallsResponse = await fetch('http://localhost:5000/api/webhook/support-calls');
                const supportCalls = await supportCallsResponse.json();
                console.log('📋 Support calls after webhook:', supportCalls);
            }, 1000);
            
        } else {
            console.log('❌ Webhook test failed');
        }
        
    } catch (error) {
        console.error('❌ Error testing webhook:', error);
    }
}

testWebhookRealistic(); 