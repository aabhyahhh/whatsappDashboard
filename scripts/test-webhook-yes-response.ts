import 'dotenv/config';
import mongoose from 'mongoose';
import { Message } from '../server/models/Message.js';
import { sendTemplateMessage } from '../server/meta.js';

async function testWebhookYesResponse() {
  try {
    console.log('🧪 Testing webhook response with "yes" variations...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp');
    console.log('✅ Connected to database');
    
    const testPhone = '+918130026321';
    
    // First, send a support prompt to create the context
    console.log(`📤 Sending support prompt to ${testPhone}...`);
    const promptResult = await sendTemplateMessage(testPhone, 'inactive_vendors_support_prompt_util');
    
    if (promptResult) {
      console.log('✅ Support prompt sent successfully');
      
      // Save the prompt message to database
      await Message.create({
        from: process.env.META_PHONE_NUMBER_ID,
        to: testPhone,
        body: 'Template: inactive_vendors_support_prompt_util',
        direction: 'outbound',
        timestamp: new Date(),
        meta: {
          template: 'inactive_vendors_support_prompt_util',
          test: true
        }
      });
      console.log('💾 Support prompt saved to database');
    }
    
    // Wait a moment for the message to be processed
    console.log('\n⏳ Waiting 3 seconds for message processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test a few key variations by simulating webhook calls
    const testVariations = ['yes', 'YESS', 'हाँ', 'जी हाँ', 'yes i need help'];
    
    console.log('\n📋 Testing webhook responses for key variations:');
    console.log('=' .repeat(60));
    
    for (const variation of testVariations) {
      console.log(`\n🧪 Testing: "${variation}"`);
      
      // Simulate incoming message
      const incomingMessage = {
        from: testPhone,
        to: process.env.META_PHONE_NUMBER_ID,
        body: variation,
        direction: 'inbound',
        timestamp: new Date(),
        meta: {
          test: true,
          variation: variation
        }
      };
      
      // Save the incoming message
      await Message.create(incomingMessage);
      console.log(`💾 Incoming message saved: "${variation}"`);
      
      // Check if there's a recent support prompt (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentSupportReminder = await Message.findOne({
        to: testPhone,
        direction: 'outbound',
        $or: [
          { body: { $regex: /inactive_vendors_support_prompt_util/ } },
          { 'meta.template': 'inactive_vendors_support_prompt_util' }
        ],
        timestamp: { $gte: oneHourAgo }
      });
      
      if (recentSupportReminder) {
        console.log('✅ Found recent support call reminder, processing "yes" response');
        
        // Check if support call already exists (to avoid duplicates)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const existingSupportCall = await Message.findOne({
          from: process.env.META_PHONE_NUMBER_ID,
          to: testPhone,
          direction: 'outbound',
          $or: [
            { body: { $regex: /inactive_vendors_reply_to_yes_support_call_util/ } },
            { 'meta.template': 'inactive_vendors_reply_to_yes_support_call_util' }
          ],
          timestamp: { $gte: oneHourAgo }
        });
        
        if (!existingSupportCall) {
          // Send confirmation message
          console.log(`📤 Sending confirmation template for: "${variation}"`);
          const confirmationResult = await sendTemplateMessage(testPhone, 'inactive_vendors_reply_to_yes_support_call_util');
          
          if (confirmationResult) {
            console.log('✅ Confirmation template sent successfully');
            
            // Save the confirmation message
            await Message.create({
              from: process.env.META_PHONE_NUMBER_ID,
              to: testPhone,
              body: 'Template: inactive_vendors_reply_to_yes_support_call_util',
              direction: 'outbound',
              timestamp: new Date(),
              meta: {
                template: 'inactive_vendors_reply_to_yes_support_call_util',
                test: true,
                responseTo: variation
              }
            });
            console.log('💾 Confirmation message saved to database');
          } else {
            console.log('❌ Failed to send confirmation template');
          }
        } else {
          console.log('ℹ️ Support call confirmation already sent recently, skipping duplicate');
        }
      } else {
        console.log('ℹ️ No recent support call reminder found for this "yes" response');
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Test completed!');
    console.log('\n📋 Check the following:');
    console.log('1. All incoming "yes" variations were saved to database');
    console.log('2. Confirmation templates were sent for each variation');
    console.log('3. Support call confirmations were saved to database');
    
    // Show recent messages for verification
    console.log('\n📋 Recent messages for verification:');
    const recentMessages = await Message.find({
      $or: [
        { to: testPhone },
        { from: testPhone }
      ]
    }).sort({ timestamp: -1 }).limit(10);
    
    recentMessages.forEach(msg => {
      const direction = msg.direction === 'inbound' ? '📥' : '📤';
      const body = msg.body.length > 50 ? msg.body.substring(0, 50) + '...' : msg.body;
      console.log(`${direction} ${msg.timestamp.toLocaleTimeString()}: ${body}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing webhook yes response:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

testWebhookYesResponse();
