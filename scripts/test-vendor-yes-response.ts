import 'dotenv/config';

async function testVendorYesResponse() {
  try {
    console.log('🧪 Testing vendor "Yes" response...');
    
    // Test with a vendor number from the inactive list
    const vendorPhone = '+918130026321';
    
    console.log(`📱 Testing "Yes" response from: ${vendorPhone}`);
    
    // Simulate the webhook payload that Twilio would send for a "Yes" response
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
        
        // Check if vendor is still in inactive list
        const inactiveResponse = await fetch('http://localhost:5000/api/webhook/inactive-vendors');
        const inactiveVendors = await inactiveResponse.json();
        const stillInactive = inactiveVendors.find((vendor: any) => 
          vendor.phone === vendorPhone
        );
        
        if (stillInactive) {
          console.log(`⚠️ Vendor ${vendorPhone} is still in inactive list`);
        } else {
          console.log(`✅ Vendor ${vendorPhone} has been moved from inactive list`);
        }
        
      }, 1000);
      
    } else {
      console.log('❌ Webhook failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing vendor response:', error);
  }
}

testVendorYesResponse(); 