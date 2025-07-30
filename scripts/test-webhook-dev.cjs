const https = require('https');
const http = require('http');

async function testWebhook() {
    try {
        console.log('🧪 Testing webhook with "Yes" response...');
        
        const webhookData = {
            Body: 'Yes',
            From: 'whatsapp:+918130026321',
            To: 'whatsapp:+15557897194',
            ButtonPayload: 'yes_support',
            ButtonText: 'Yes'
        };
        
        const postData = new URLSearchParams(webhookData).toString();
        
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/webhook',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            console.log('📡 Webhook Response Status:', res.statusCode);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('📡 Webhook Response:', data);
                
                if (res.statusCode === 200) {
                    console.log('✅ Webhook test successful!');
                    console.log('📋 Check the Support Calls page for the new entry');
                } else {
                    console.log('❌ Webhook test failed');
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Request error:', error);
        });
        
        req.write(postData);
        req.end();
        
    } catch (error) {
        console.error('❌ Error testing webhook:', error);
    }
}

testWebhook(); 