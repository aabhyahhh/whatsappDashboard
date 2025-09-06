#!/usr/bin/env tsx

/**
 * Debug script to analyze message health data structure
 * This will help identify why the message categorization is not working
 */

import { connectDB } from '../server/db.js';
import { Message } from '../server/models/Message.js';
import SupportCallLog from '../server/models/SupportCallLog.js';
import LoanReplyLog from '../server/models/LoanReplyLog.js';

async function debugMessageHealth() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    console.log(`📅 Analyzing messages from: ${fortyEightHoursAgo.toISOString()}`);
    
    // Get all outbound messages in the last 48 hours
    const outboundMessages = await Message.find({
      direction: 'outbound',
      timestamp: { $gte: fortyEightHoursAgo }
    }).sort({ timestamp: -1 });
    
    console.log(`📊 Total outbound messages in last 48h: ${outboundMessages.length}`);
    
    if (outboundMessages.length > 0) {
      console.log('\n🔍 Sample outbound messages:');
      outboundMessages.slice(0, 5).forEach((msg, index) => {
        console.log(`\nMessage ${index + 1}:`);
        console.log(`  From: ${msg.from}`);
        console.log(`  To: ${msg.to}`);
        console.log(`  Body: ${msg.body}`);
        console.log(`  Timestamp: ${msg.timestamp}`);
        console.log(`  Meta: ${JSON.stringify(msg.meta, null, 2)}`);
      });
    }
    
    // Check for Meta messages specifically
    const metaPhoneNumberId = process.env.META_PHONE_NUMBER_ID;
    console.log(`\n📱 META_PHONE_NUMBER_ID: ${metaPhoneNumberId}`);
    
    const metaMessages = outboundMessages.filter(msg => 
      msg.from === metaPhoneNumberId || 
      (msg.meta && msg.meta.type && msg.meta.type.includes('meta'))
    );
    
    console.log(`📊 Meta messages found: ${metaMessages.length}`);
    
    if (metaMessages.length > 0) {
      console.log('\n🔍 Sample Meta messages:');
      metaMessages.slice(0, 3).forEach((msg, index) => {
        console.log(`\nMeta Message ${index + 1}:`);
        console.log(`  From: ${msg.from}`);
        console.log(`  Body: ${msg.body}`);
        console.log(`  Meta: ${JSON.stringify(msg.meta, null, 2)}`);
      });
    }
    
    // Check message body patterns
    console.log('\n🔍 Message body patterns:');
    const bodyPatterns = {};
    outboundMessages.forEach(msg => {
      const body = msg.body || '[empty]';
      bodyPatterns[body] = (bodyPatterns[body] || 0) + 1;
    });
    
    Object.entries(bodyPatterns)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .forEach(([body, count]) => {
        console.log(`  "${body}": ${count} messages`);
      });
    
    // Check Support Call Logs
    const supportCallLogs = await SupportCallLog.find({
      timestamp: { $gte: fortyEightHoursAgo }
    }).sort({ timestamp: -1 });
    
    console.log(`\n📞 Support Call Logs in last 48h: ${supportCallLogs.length}`);
    
    if (supportCallLogs.length > 0) {
      console.log('\n🔍 Sample Support Call Logs:');
      supportCallLogs.slice(0, 3).forEach((log, index) => {
        console.log(`\nSupport Call Log ${index + 1}:`);
        console.log(`  Phone: ${log.phone}`);
        console.log(`  Timestamp: ${log.timestamp}`);
        console.log(`  Status: ${log.status}`);
        console.log(`  Message: ${log.message}`);
      });
    }
    
    // Check Loan Reply Logs
    const loanReplyLogs = await LoanReplyLog.find({
      timestamp: { $gte: fortyEightHoursAgo }
    }).sort({ timestamp: -1 });
    
    console.log(`\n💰 Loan Reply Logs in last 48h: ${loanReplyLogs.length}`);
    
    if (loanReplyLogs.length > 0) {
      console.log('\n🔍 Sample Loan Reply Logs:');
      loanReplyLogs.slice(0, 3).forEach((log, index) => {
        console.log(`\nLoan Reply Log ${index + 1}:`);
        console.log(`  Phone: ${log.phone}`);
        console.log(`  Timestamp: ${log.timestamp}`);
        console.log(`  Response: ${log.response}`);
        console.log(`  Aadhaar Status: ${log.aadhaarStatus}`);
      });
    }
    
    // Test the categorization logic
    console.log('\n🧪 Testing categorization logic...');
    
    const metaMessageTypes = {
      'Meta Location Update': 'update_location_cron',
      'Meta Support Prompt': 'inactive_vendors_support_prompt_util',
      'Meta Support Confirmation': 'inactive_vendors_reply_to_yes_support_call_util',
      'Meta Greeting Response': 'default_hi_and_loan_prompt',
      'Meta Loan Prompt': 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util',
      'Meta Welcome Message': 'welcome_message_for_onboarding_util'
    };
    
    const metaCategorizedMessages: any = {};
    const metaUnknownMessages: any[] = [];
    
    for (const message of metaMessages) {
      let categorized = false;
      
      // Check message body for template names
      for (const [type, templateName] of Object.entries(metaMessageTypes)) {
        if (message.body === templateName || 
            (message.meta && message.meta.template === templateName)) {
          if (!metaCategorizedMessages[type]) {
            metaCategorizedMessages[type] = [];
          }
          metaCategorizedMessages[type].push({
            to: message.to,
            timestamp: message.timestamp,
            body: message.body,
            meta: message.meta
          });
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        metaUnknownMessages.push({
          to: message.to,
          timestamp: message.timestamp,
          body: message.body,
          meta: message.meta
        });
      }
    }
    
    console.log('\n📊 Categorization Results:');
    Object.entries(metaCategorizedMessages).forEach(([type, messages]: [string, any]) => {
      console.log(`  ${type}: ${messages.length} messages`);
    });
    console.log(`  Unknown: ${metaUnknownMessages.length} messages`);
    
    if (metaUnknownMessages.length > 0) {
      console.log('\n🔍 Unknown messages:');
      metaUnknownMessages.slice(0, 5).forEach((msg, index) => {
        console.log(`  ${index + 1}. Body: "${msg.body}", Meta: ${JSON.stringify(msg.meta)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error debugging message health:', error);
  } finally {
    process.exit(0);
  }
}

debugMessageHealth();
