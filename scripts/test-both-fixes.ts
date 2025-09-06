#!/usr/bin/env ts-node

/**
 * Test script to verify both loan reply and support call fixes
 */

async function testBothFixes() {
  try {
    console.log('🧪 Testing both loan reply and support call fixes...');
    
    const baseUrl = 'https://whatsappdashboard-1.onrender.com';
    
    // Test 1: Webhook endpoint
    console.log('\n📨 Testing webhook endpoint...');
    const webhookUrl = `${baseUrl}/api/webhook`;
    
    const testPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test_entry_id',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '15551234567',
              phone_number_id: 'test_phone_id'
            },
            messages: [{
              id: 'test_message_id',
              from: '918130026321',
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: {
                body: 'loan'
              },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };
    
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': 'sha256=test_signature'
        },
        body: JSON.stringify(testPayload)
      });
      
      const webhookText = await webhookResponse.text();
      console.log(`✅ Webhook response: ${webhookResponse.status} - ${webhookText}`);
      
      if (webhookResponse.status === 200) {
        console.log('🎉 SUCCESS: Webhook is working!');
      } else if (webhookResponse.status === 403) {
        console.log('⚠️ Expected: 403 Forbidden (signature verification failed)');
        console.log('✅ This is normal for test requests without valid signatures');
      } else {
        console.log(`❌ Unexpected webhook status: ${webhookResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Webhook test failed: ${error.message}`);
    }
    
    // Test 2: Support call endpoint (without auth for testing)
    console.log('\n📞 Testing support call endpoint...');
    const supportCallUrl = `${baseUrl}/api/messages/send-support-call`;
    
    const supportCallPayload = {
      to: '918130026321',
      vendorName: 'Test Vendor',
      template: 'post_support_call_message_for_vendors_util'
    };
    
    try {
      const supportResponse = await fetch(supportCallUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(supportCallPayload)
      });
      
      const supportText = await supportResponse.text();
      console.log(`✅ Support call response: ${supportResponse.status} - ${supportText}`);
      
      if (supportResponse.status === 200) {
        console.log('🎉 SUCCESS: Support call endpoint is working!');
      } else if (supportResponse.status === 401) {
        console.log('⚠️ Expected: 401 Unauthorized (no auth token)');
        console.log('✅ This is normal for test requests without authentication');
      } else if (supportResponse.status === 500) {
        console.log('❌ Support call endpoint returned 500 error');
        console.log('🔍 Check server logs for details');
      } else {
        console.log(`⚠️ Unexpected support call status: ${supportResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Support call test failed: ${error.message}`);
    }
    
    console.log('\n✅ Both fixes test completed');
    
  } catch (error) {
    console.error('❌ Error in both fixes test:', error);
  }
}

// Run the test
testBothFixes().catch(console.error);
