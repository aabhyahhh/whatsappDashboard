import 'dotenv/config';

async function testVendorResponses() {
    try {
        console.log('🧪 Testing vendor "Yes" responses...');
        
        // Test with a few vendor numbers from the inactive list
        const testVendors = [
            '+918130026321',
        ];
        
        for (const vendorPhone of testVendors) {
            console.log(`\n📱 Testing response from: ${vendorPhone}`);
            
            // Simulate the webhook payload that Twilio would send
            const webhookData = {
                Body: 'Yes',
                From: `whatsapp:${vendorPhone}`,
                To: 'whatsapp:+15557897194',
                MessageSid: `MM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                AccountSid: process.env.TWILIO_ACCOUNT_SID || '',
                ButtonPayload: 'yes_support',
                ButtonText: 'Yes'
            };
            
            console.log('📡 Sending webhook payload...');
            
            const response = await fetch('http://localhost:5000/api/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(webhookData)
            });
            
            console.log('📡 Response Status:', response.status);
            
            if (response.ok) {
                console.log('✅ Webhook processed successfully');
                
                // Check if support call was logged
                setTimeout(async () => {
                    const supportCallsResponse = await fetch('http://localhost:5000/api/webhook/support-calls');
                    const supportCalls = await supportCallsResponse.json();
                    console.log(`📋 Support calls after response: ${supportCalls.length}`);
                    
                    // Find the latest entry for this vendor
                    const latestCall = supportCalls.find((call: any) => 
                        call.contactNumber === vendorPhone
                    );
                    
                    if (latestCall) {
                        console.log(`✅ Support call logged for ${vendorPhone}`);
                        console.log(`📋 Call ID: ${latestCall._id}`);
                        console.log(`📋 Status: ${latestCall.completed ? 'Completed' : 'Pending'}`);
                    }
                }, 1000);
                
            } else {
                console.log('❌ Webhook failed');
            }
            
            // Add delay between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('\n📊 Final check of support calls...');
        const finalSupportCallsResponse = await fetch('http://localhost:5000/api/webhook/support-calls');
        const finalSupportCalls = await finalSupportCallsResponse.json();
        console.log(`📋 Total support calls: ${finalSupportCalls.length}`);
        
        finalSupportCalls.forEach((call: any, index: number) => {
            console.log(`${index + 1}. ${call.vendorName} (${call.contactNumber}) - ${call.completed ? 'Completed' : 'Pending'}`);
        });
        
    } catch (error) {
        console.error('❌ Error testing vendor responses:', error);
    }
}

testVendorResponses(); 