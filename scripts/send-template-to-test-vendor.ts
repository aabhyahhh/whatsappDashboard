#!/usr/bin/env ts-node

/**
 * Script to send template messages to test vendor
 * 
 * Usage:
 *   ts-node scripts/send-template-to-test-vendor.ts --template vendor_review_proof --language en
 *   ts-node scripts/send-template-to-test-vendor.ts --template update_location_cron_util --language en
 *   ts-node scripts/send-template-to-test-vendor.ts --template default_hi_and_loan_prompt --language hi
 * 
 * Available templates:
 *   - vendor_review_proof (en)
 *   - update_location_cron_util (en)
 *   - inactive_vendors_support_prompt_util (en)
 *   - inactive_vendors_reply_to_yes_support_call_util (en)
 *   - default_hi_and_loan_prompt (hi)
 *   - reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util (en)
 *   - reply_to_yes_to_aadhar_verification_util (en)
 *   - welcome_message_for_onboarding_util (hi)
 *   - post_support_call_message_for_vendors_util (en)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { sendTemplateMessage, MESSAGE_TEMPLATES } from '../server/meta.js';
import { Message } from '../server/models/Message.js';

// Parse command line arguments
const args = process.argv.slice(2);
let templateName = '';
let language = '';

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--template' && args[i + 1]) {
    templateName = args[i + 1];
    i++; // Skip next argument as it's the template name
  } else if (args[i] === '--language' && args[i + 1]) {
    language = args[i + 1];
    i++; // Skip next argument as it's the language
  }
}

// Validate arguments
if (!templateName || !language) {
  console.error('❌ Error: Both --template and --language are required');
  console.log('\nUsage:');
  console.log('  ts-node scripts/send-template-to-test-vendor.ts --template <template_name> --language <language>');
  console.log('\nExample:');
  console.log('  ts-node scripts/send-template-to-test-vendor.ts --template vendor_review_proof --language en');
  console.log('\nAvailable templates:');
  Object.entries(MESSAGE_TEMPLATES).forEach(([key, template]) => {
    console.log(`  - ${key} (${template.language})`);
  });
  process.exit(1);
}

// Validate template exists
if (!MESSAGE_TEMPLATES[templateName]) {
  console.error(`❌ Error: Template "${templateName}" not found`);
  console.log('\nAvailable templates:');
  Object.entries(MESSAGE_TEMPLATES).forEach(([key, template]) => {
    console.log(`  - ${key} (${template.language})`);
  });
  process.exit(1);
}

// Validate template language matches
const template = MESSAGE_TEMPLATES[templateName];
if (template.language !== language) {
  console.error(`❌ Error: Template "${templateName}" uses language "${template.language}", but you specified "${language}"`);
  console.log(`\nCorrect usage: --template ${templateName} --language ${template.language}`);
  process.exit(1);
}

async function sendTemplateToTestVendor() {
  try {
    console.log('🚀 SENDING TEMPLATE TO TEST VENDOR');
    console.log('==================================');
    console.log(`📋 Template: ${templateName}`);
    console.log(`🌐 Language: ${language}`);
    console.log(`📱 Test Vendor: +918130026321`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log('');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Check Meta credentials
    if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
      console.error('❌ Error: Meta WhatsApp credentials not configured');
      console.error('Required environment variables:');
      console.error('  - META_ACCESS_TOKEN');
      console.error('  - META_PHONE_NUMBER_ID');
      process.exit(1);
    }
    console.log('✅ Meta WhatsApp credentials configured');

    const testVendorPhone = '+918130026321';

    try {
      console.log(`\n📤 Sending template to test vendor...`);

      // Send template message
      const result = await sendTemplateMessage(testVendorPhone, templateName);

      if (result && result.messages && result.messages.length > 0) {
        // Save message to database
        await Message.create({
          from: process.env.META_PHONE_NUMBER_ID,
          to: testVendorPhone,
          body: `Template: ${templateName}`,
          direction: 'outbound',
          timestamp: new Date(),
          messageId: result.messages[0].id,
          meta: {
            template: templateName,
            language: language,
            campaign: 'test-vendor-send',
            testVendor: true
          }
        });

        console.log(`✅ Template sent successfully to test vendor!`);
        console.log(`📱 Message ID: ${result.messages[0].id}`);
        console.log(`💾 Message saved to database`);
      } else {
        console.error(`❌ Failed to send template - No message ID returned`);
        console.error('Response:', result);
      }

    } catch (error: any) {
      console.error(`❌ Failed to send template:`, error.message || error);
    }

    console.log(`\n⏰ Completed at: ${new Date().toLocaleString()}`);

  } catch (error: any) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the function
sendTemplateToTestVendor().then(() => {
  console.log('\n🏁 Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
