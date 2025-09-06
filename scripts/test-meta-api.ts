#!/usr/bin/env ts-node

/**
 * Test script to verify Meta API credentials and template
 */

import { sendTemplateMessage, areMetaCredentialsAvailable } from '../server/meta.js';

async function testMetaAPI() {
  try {
    console.log('🧪 Testing Meta API...');
    
    // Check credentials
    console.log('\n🔑 Checking Meta credentials...');
    if (!areMetaCredentialsAvailable()) {
      console.log('❌ Meta credentials not available');
      return;
    } else {
      console.log('✅ Meta credentials are available');
    }
    
    // Test template sending
    console.log('\n📤 Testing template sending...');
    const testPhoneNumber = '918130026321'; // WhatsApp ID format
    
    try {
      const result = await sendTemplateMessage(testPhoneNumber, 'post_support_call_message_for_vendors_util');
      if (result) {
        console.log('✅ Template sent successfully');
        console.log('   - Result:', result);
      } else {
        console.log('❌ Template sending failed - result is null');
      }
    } catch (error) {
      console.log('❌ Template sending failed with error');
      console.log('   - Error:', error.message);
    }
    
    console.log('\n✅ Meta API test completed');
    
  } catch (error) {
    console.error('❌ Error in Meta API test:', error);
  }
}

// Run the test
testMetaAPI().catch(console.error);
