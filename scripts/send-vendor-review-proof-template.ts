#!/usr/bin/env ts-node

/**
 * Script to send vendor_review_proof template to all users
 * 
 * This script specifically sends the vendor_review_proof template in English to all users
 * who have WhatsApp consent enabled.
 * 
 * Usage:
 *   ts-node scripts/send-vendor-review-proof-template.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { sendTemplateMessage } from '../server/meta.js';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';

const TEMPLATE_NAME = 'vendor_review_proof';
const TEMPLATE_LANGUAGE = 'en';

async function sendVendorReviewProofTemplate() {
  try {
    console.log('🚀 SENDING VENDOR REVIEW PROOF TEMPLATE TO ALL USERS');
    console.log('==================================================');
    console.log(`📋 Template: ${TEMPLATE_NAME}`);
    console.log(`🌐 Language: ${TEMPLATE_LANGUAGE}`);
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
      contactNumber: { $exists: true, $ne: null, $ne: '' },
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

    console.log('\n📤 Starting to send vendor_review_proof template...\n');

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
        const result = await sendTemplateMessage(contact, TEMPLATE_NAME);

        if (result && result.messages && result.messages.length > 0) {
          // Save message to database
          await Message.create({
            from: process.env.META_PHONE_NUMBER_ID,
            to: contact,
            body: TEMPLATE_NAME,
            direction: 'outbound',
            timestamp: new Date(),
            messageId: result.messages[0].id,
            meta: {
              template: TEMPLATE_NAME,
              language: TEMPLATE_LANGUAGE,
              campaign: 'vendor-review-proof-bulk-send',
              userId: user._id.toString(),
              userName: userName
            }
          });

          sent++;
          console.log(`✅ Sent vendor_review_proof template to ${userName} (${contact})`);
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
      console.log(`\n🎉 Successfully sent vendor_review_proof template to ${sent} users!`);
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
sendVendorReviewProofTemplate().then(() => {
  console.log('\n🏁 Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
