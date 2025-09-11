#!/usr/bin/env ts-node

/**
 * Script to send template messages to all users based on template name and language
 * 
 * Usage:
 *   ts-node scripts/send-template-to-all-users.ts --template vendor_review_proof --language en
 *   ts-node scripts/send-template-to-all-users.ts --template update_location_cron_util --language en
 *   ts-node scripts/send-template-to-all-users.ts --template default_hi_and_loan_prompt --language hi
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
import { User } from '../server/models/User.js';
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
  console.log('  ts-node scripts/send-template-to-all-users.ts --template <template_name> --language <language>');
  console.log('\nExample:');
  console.log('  ts-node scripts/send-template-to-all-users.ts --template vendor_review_proof --language en');
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

async function sendTemplateToAllUsers() {
  try {
    console.log('🚀 SENDING TEMPLATE TO ALL USERS');
    console.log('================================');
    console.log(`📋 Template: ${templateName}`);
    console.log(`🌐 Language: ${language}`);
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

    // Get all users with valid contact numbers and WhatsApp consent
    console.log('\n📊 Fetching users...');
    const users = await User.find({
      contactNumber: { $exists: true, $nin: [null, ''] },
      whatsappConsent: true
    });
    
    console.log(`📋 Found ${users.length} users with WhatsApp consent`);

    if (users.length === 0) {
      console.log('⚠️ No users found with WhatsApp consent. Exiting.');
      process.exit(0);
    }

    // Statistics
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    console.log('\n📤 Starting to send messages...\n');

    // Process each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const contact = user.contactNumber;
      const userName = user.name || 'Unknown';

      // Validate contact number
      if (!contact || typeof contact !== 'string' || contact.length < 10) {
        console.warn(`⚠️ Skipping user ${user._id} - invalid contact number: ${contact}`);
        skipped++;
        continue;
      }

      try {
        console.log(`[${i + 1}/${users.length}] Sending to ${userName} (${contact})...`);

        // Send template message
        const result = await sendTemplateMessage(contact, templateName);

        if (result && result.messages && result.messages.length > 0) {
          // Save message to database
          await Message.create({
            from: process.env.META_PHONE_NUMBER_ID,
            to: contact,
            body: templateName,
            direction: 'outbound',
            timestamp: new Date(),
            messageId: result.messages[0].id,
            meta: {
              template: templateName,
              language: language,
              campaign: 'bulk-template-send',
              userId: (user._id as any).toString(),
              userName: userName
            }
          });

          sent++;
          console.log(`✅ Sent successfully to ${userName} (${contact})`);
        } else {
          failed++;
          console.error(`❌ Failed to send to ${userName} (${contact}) - No message ID returned`);
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        failed++;
        console.error(`❌ Failed to send to ${userName} (${contact}):`, error.message || error);
      }
    }

    // Summary
    console.log('\n📈 SUMMARY');
    console.log('==========');
    console.log(`✅ Successfully sent: ${sent}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏩ Skipped: ${skipped}`);
    console.log(`📊 Total processed: ${sent + failed + skipped}`);
    console.log(`⏰ Completed at: ${new Date().toLocaleString()}`);

    if (failed > 0) {
      console.log(`\n⚠️ ${failed} messages failed to send. Check the logs above for details.`);
    }

    if (sent > 0) {
      console.log(`\n🎉 Successfully sent ${templateName} template to ${sent} users!`);
    }

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
sendTemplateToAllUsers().then(() => {
  console.log('\n🏁 Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
