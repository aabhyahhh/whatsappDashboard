import mongoose from 'mongoose';
import { Message } from '../server/models/Message.js';
import { Contact } from '../server/models/Contact.js';
import { User } from '../server/models/User.js';
import SupportCallLog from '../server/models/SupportCallLog.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;

async function testYesReplyHandling() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧪 TESTING YES REPLY HANDLING FOR SUPPORT CALLS');
    console.log('===============================================');
    
    // Test 1: Check recent support call logs
    const recentSupportCalls = await SupportCallLog.find({})
      .sort({ timestamp: -1 })
      .limit(20);
    
    console.log(`📞 Recent Support Call Logs (${recentSupportCalls.length}):`);
    console.log('==========================================');
    recentSupportCalls.forEach((log, index) => {
      console.log(`${index + 1}. ${log.vendorName} (${log.contactNumber})`);
      console.log(`   - Timestamp: ${log.timestamp.toLocaleString()}`);
      console.log(`   - Completed: ${log.completed ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Test 2: Check for recent "yes" replies in messages
    const recentYesReplies = await Message.find({
      direction: 'inbound',
      body: { $regex: /^(yes|हाँ|हां)$/i },
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ timestamp: -1 });
    
    console.log(`\n💬 Recent "Yes" Replies (${recentYesReplies.length}):`);
    console.log('==========================================');
    recentYesReplies.forEach((message, index) => {
      console.log(`${index + 1}. From: ${message.from}`);
      console.log(`   - Body: "${message.body}"`);
      console.log(`   - Timestamp: ${message.timestamp.toLocaleString()}`);
      console.log('');
    });
    
    // Test 3: Check for support confirmation messages sent
    const recentSupportConfirmations = await Message.find({
      direction: 'outbound',
      $or: [
        { body: { $regex: /inactive_vendors_reply_to_yes_support_call_util/ } },
        { 'meta.template': 'inactive_vendors_reply_to_yes_support_call_util' },
        { body: { $regex: /Support request received/ } }
      ],
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ timestamp: -1 });
    
    console.log(`\n✅ Recent Support Confirmations Sent (${recentSupportConfirmations.length}):`);
    console.log('====================================================');
    recentSupportConfirmations.forEach((message, index) => {
      console.log(`${index + 1}. To: ${message.to}`);
      console.log(`   - Body: "${message.body}"`);
      console.log(`   - Template: ${message.meta?.template || 'N/A'}`);
      console.log(`   - Timestamp: ${message.timestamp.toLocaleString()}`);
      console.log('');
    });
    
    // Test 4: Check for support prompt messages sent
    const recentSupportPrompts = await Message.find({
      direction: 'outbound',
      $or: [
        { body: { $regex: /inactive_vendors_support_prompt_util/ } },
        { 'meta.template': 'inactive_vendors_support_prompt_util' }
      ],
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ timestamp: -1 });
    
    console.log(`\n📱 Recent Support Prompts Sent (${recentSupportPrompts.length}):`);
    console.log('==============================================');
    recentSupportPrompts.forEach((message, index) => {
      console.log(`${index + 1}. To: ${message.to}`);
      console.log(`   - Body: "${message.body}"`);
      console.log(`   - Template: ${message.meta?.template || 'N/A'}`);
      console.log(`   - Timestamp: ${message.timestamp.toLocaleString()}`);
      console.log('');
    });
    
    // Test 5: Analyze the flow - find vendors who received prompts and then replied yes
    console.log('\n🔄 Analyzing Support Call Flow:');
    console.log('===============================');
    
    let flowMatches = 0;
    for (const supportCall of recentSupportCalls) {
      // Find if there was a support prompt sent before this support call
      const supportPrompt = await Message.findOne({
        to: supportCall.contactNumber,
        direction: 'outbound',
        $or: [
          { body: { $regex: /inactive_vendors_support_prompt_util/ } },
          { 'meta.template': 'inactive_vendors_support_prompt_util' }
        ],
        timestamp: { $lt: supportCall.timestamp }
      }).sort({ timestamp: -1 });
      
      // Find if there was a yes reply
      const yesReply = await Message.findOne({
        from: supportCall.contactNumber,
        direction: 'inbound',
        body: { $regex: /^(yes|हाँ|हां)$/i },
        timestamp: { $gte: supportPrompt?.timestamp || new Date(0), $lt: supportCall.timestamp }
      });
      
      // Find if there was a confirmation sent
      const confirmation = await Message.findOne({
        to: supportCall.contactNumber,
        direction: 'outbound',
        $or: [
          { body: { $regex: /inactive_vendors_reply_to_yes_support_call_util/ } },
          { 'meta.template': 'inactive_vendors_reply_to_yes_support_call_util' }
        ],
        timestamp: { $gte: supportCall.timestamp }
      });
      
      if (supportPrompt && yesReply && confirmation) {
        flowMatches++;
        console.log(`✅ Complete flow for ${supportCall.vendorName} (${supportCall.contactNumber}):`);
        console.log(`   1. Support prompt sent: ${supportPrompt.timestamp.toLocaleString()}`);
        console.log(`   2. Yes reply received: ${yesReply.timestamp.toLocaleString()}`);
        console.log(`   3. Support call logged: ${supportCall.timestamp.toLocaleString()}`);
        console.log(`   4. Confirmation sent: ${confirmation.timestamp.toLocaleString()}`);
        console.log('');
      }
    }
    
    console.log(`📊 Complete flow matches: ${flowMatches} out of ${recentSupportCalls.length} support calls`);
    
    // Test 6: Summary
    console.log('\n📊 Summary:');
    console.log('===========');
    console.log(`- Recent support calls: ${recentSupportCalls.length}`);
    console.log(`- Recent "yes" replies: ${recentYesReplies.length}`);
    console.log(`- Support confirmations sent: ${recentSupportConfirmations.length}`);
    console.log(`- Support prompts sent: ${recentSupportPrompts.length}`);
    console.log(`- Complete flow matches: ${flowMatches}`);
    
    if (flowMatches > 0) {
      console.log('\n✅ Yes reply handling is working correctly!');
    } else {
      console.log('\n⚠️ No complete flows found - may need more test data');
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the test
testYesReplyHandling().catch(console.error);
