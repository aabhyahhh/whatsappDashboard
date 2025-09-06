import mongoose from 'mongoose';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;

async function testMetaHealthDetection() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧪 TESTING META HEALTH DETECTION LOGIC');
    console.log('=====================================');
    
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    console.log(`📅 48 hours ago: ${fortyEightHoursAgo.toLocaleString()}`);
    
    // Get all outbound messages in the last 48 hours
    const outboundMessages = await Message.find({
      direction: 'outbound',
      timestamp: { $gte: fortyEightHoursAgo }
    }).sort({ timestamp: -1 });
    
    console.log(`📊 Total outbound messages (48h): ${outboundMessages.length}`);
    console.log(`📱 META_PHONE_NUMBER_ID: ${process.env.META_PHONE_NUMBER_ID}`);
    
    // Define Meta message types with multiple detection patterns
    const metaMessageTypes = {
      'Meta Location Update': {
        bodyPatterns: ['Template: update_location_cron', 'update_location_cron_util'],
        metaPatterns: ['vendor_location_open', 'update_location_cron'],
        templateNames: ['update_location_cron_util', 'update_location_cron']
      },
      'Meta Support Prompt': {
        bodyPatterns: ['Template: inactive_vendors_support_prompt_util', 'inactive_vendors_support_prompt_util'],
        metaPatterns: ['support_prompt', 'inactive_vendors_support_prompt'],
        templateNames: ['inactive_vendors_support_prompt_util']
      },
      'Meta Support Confirmation': {
        bodyPatterns: ['Support request received', 'inactive_vendors_reply_to_yes_support_call_util'],
        metaPatterns: ['support_confirmation', 'inactive_vendors_reply_to_yes_support_call'],
        templateNames: ['inactive_vendors_reply_to_yes_support_call_util']
      },
      'Meta Greeting Response': {
        bodyPatterns: ['Namaste from Laari Khojo', 'default_hi_and_loan_prompt'],
        metaPatterns: ['greeting_response', 'default_hi_and_loan_prompt'],
        templateNames: ['default_hi_and_loan_prompt']
      },
      'Meta Loan Prompt': {
        bodyPatterns: ['Loan support response sent', 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util'],
        metaPatterns: ['loan_response', 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not'],
        templateNames: ['reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util']
      }
    };
    
    // Categorize Meta messages
    const metaCategorizedMessages: any = {};
    const metaUnknownMessages: any[] = [];
    
    for (const message of outboundMessages) {
      let categorized = false;
      
      // Check if message is from Meta integration
      if (message.from === process.env.META_PHONE_NUMBER_ID || 
          (message.meta && message.meta.type && message.meta.type.includes('meta'))) {
        
        // Check message against all patterns for each type
        for (const [type, patterns] of Object.entries(metaMessageTypes)) {
          const typePatterns = patterns as any;
          
          // Check body patterns
          const bodyMatch = typePatterns.bodyPatterns.some((pattern: string) => 
            message.body && message.body.includes(pattern)
          );
          
          // Check meta patterns
          const metaMatch = typePatterns.metaPatterns.some((pattern: string) => 
            (message.meta && message.meta.reminderType && message.meta.reminderType.includes(pattern)) ||
            (message.meta && message.meta.type && message.meta.type.includes(pattern)) ||
            (message.meta && message.meta.template && message.meta.template.includes(pattern))
          );
          
          // Check template names
          const templateMatch = typePatterns.templateNames.some((templateName: string) => 
            message.body === templateName || 
            (message.meta && message.meta.template === templateName)
          );
          
          if (bodyMatch || metaMatch || templateMatch) {
            if (!metaCategorizedMessages[type]) {
              metaCategorizedMessages[type] = [];
            }
            metaCategorizedMessages[type].push({
              to: message.to,
              timestamp: message.timestamp,
              body: message.body,
              meta: message.meta,
              vendorName: message.meta?.vendorName || 'Unknown'
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
    }
    
    // Get support call reminder logs
    const metaSupportReminderLogs = await SupportCallReminderLog.find({
      sentAt: { $gte: fortyEightHoursAgo }
    }).sort({ sentAt: -1 });
    
    // Enhance categorized messages with vendor names
    for (const [type, messages] of Object.entries(metaCategorizedMessages)) {
      for (const message of messages as any[]) {
        if (!message.vendorName || message.vendorName === 'Unknown') {
          try {
            const vendor = await User.findOne({ contactNumber: message.to });
            if (vendor) {
              message.vendorName = vendor.name;
            }
          } catch (error) {
            console.error('Error fetching vendor name:', error);
          }
        }
      }
    }
    
    // Display results
    console.log('\n📊 CATEGORIZED MESSAGES:');
    console.log('========================');
    
    for (const [type, messages] of Object.entries(metaCategorizedMessages)) {
      console.log(`\n${type}: ${(messages as any[]).length} messages`);
      (messages as any[]).slice(0, 5).forEach((msg, i) => {
        console.log(`  ${i + 1}. To: ${msg.to} (${msg.vendorName})`);
        console.log(`     Time: ${msg.timestamp.toLocaleString()}`);
        console.log(`     Body: "${msg.body}"`);
        if (msg.meta?.reminderType) {
          console.log(`     Reminder Type: ${msg.meta.reminderType}`);
        }
        console.log('');
      });
    }
    
    console.log(`\n📞 SUPPORT REMINDER LOGS (48h): ${metaSupportReminderLogs.length}`);
    console.log('==========================================');
    metaSupportReminderLogs.slice(0, 10).forEach((log, i) => {
      console.log(`${i + 1}. ${log.contactNumber} - ${log.sentAt.toLocaleString()}`);
    });
    
    console.log(`\n❓ UNKNOWN MESSAGES: ${metaUnknownMessages.length}`);
    console.log('=============================');
    metaUnknownMessages.slice(0, 5).forEach((msg, i) => {
      console.log(`${i + 1}. To: ${msg.to}`);
      console.log(`   Body: "${msg.body}"`);
      console.log(`   Meta: ${JSON.stringify(msg.meta)}`);
      console.log('');
    });
    
    // Summary
    const totalCategorized = Object.values(metaCategorizedMessages).reduce((sum: number, messages: any) => sum + messages.length, 0);
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`- Total outbound messages: ${outboundMessages.length}`);
    console.log(`- Categorized messages: ${totalCategorized}`);
    console.log(`- Unknown messages: ${metaUnknownMessages.length}`);
    console.log(`- Support reminder logs: ${metaSupportReminderLogs.length}`);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the test
testMetaHealthDetection().catch(console.error);
