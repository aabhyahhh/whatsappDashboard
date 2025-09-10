import mongoose from 'mongoose';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import SupportCallReminderLog from '../server/models/SupportCallReminderLog.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;

async function testMetaHealthAPI() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧪 TESTING META HEALTH API LOGIC');
    console.log('=================================');
    
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
        metaPatterns: ['vendor_location_open', 'vendor_location_15min', 'update_location_cron'],
        templateNames: ['update_location_cron_util', 'update_location_cron']
      },
      'Meta Support Prompt': {
        bodyPatterns: ['Template: inactive_vendors_support_prompt_util', 'inactive_vendors_support_prompt_util'],
        metaPatterns: ['support_prompt', 'inactive_vendors_support_prompt'],
        templateNames: ['inactive_vendors_support_prompt_util']
      }
    };
    
    // Categorize Meta messages
    const metaCategorizedMessages: any = {};
    
    for (const message of outboundMessages) {
      if (message.from === process.env.META_PHONE_NUMBER_ID) {
        for (const [type, patterns] of Object.entries(metaMessageTypes)) {
          const typePatterns = patterns as any;
          
          const bodyMatch = typePatterns.bodyPatterns.some((pattern: string) => 
            message.body && message.body.includes(pattern)
          );
          
          const metaMatch = typePatterns.metaPatterns.some((pattern: string) => 
            (message.meta && message.meta.reminderType && message.meta.reminderType.includes(pattern)) ||
            (message.meta && message.meta.type && message.meta.type.includes(pattern)) ||
            (message.meta && message.meta.template && message.meta.template.includes(pattern))
          );
          
          if (bodyMatch || metaMatch) {
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
            break;
          }
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
    
    // Calculate statistics
    const metaStats = {
      totalMetaMessages: Object.values(metaCategorizedMessages).reduce((sum: number, messages: any) => sum + messages.length, 0),
      totalSupportReminders: metaSupportReminderLogs.length,
      messageTypes: Object.keys(metaCategorizedMessages).map(type => ({
        type,
        count: metaCategorizedMessages[type]?.length || 0
      }))
    };
    
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
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`- Total outbound messages: ${outboundMessages.length}`);
    console.log(`- Categorized messages: ${metaStats.totalMetaMessages}`);
    console.log(`- Support reminder logs: ${metaStats.totalSupportReminders}`);
    
    // Test the API response structure
    console.log('\n🔍 API RESPONSE STRUCTURE:');
    console.log('==========================');
    const apiResponse = {
      stats: metaStats,
      categorizedMessages: metaCategorizedMessages,
      supportReminderLogs: metaSupportReminderLogs.slice(0, 10),
      timeRange: {
        from: fortyEightHoursAgo,
        to: new Date()
      }
    };
    
    console.log('Stats:', JSON.stringify(apiResponse.stats, null, 2));
    console.log('Categorized Messages Keys:', Object.keys(apiResponse.categorizedMessages));
    console.log('Support Reminder Logs Count:', apiResponse.supportReminderLogs.length);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the test
testMetaHealthAPI().catch(console.error);
