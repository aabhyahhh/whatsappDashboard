import 'dotenv/config';
import mongoose from 'mongoose';
import { Message } from '../server/models/Message.js';
import { sendTemplateMessage } from '../server/meta.js';

// Test all variations of "help" requests
const helpVariations = [
  'help', 'Help', 'HELP', 'helpp', 'Helpp', 'HELPP', 'helppp', 'Helppp', 'HELPPP',
  'support', 'Support', 'SUPPORT', 'assist', 'Assist', 'ASSIST',
  'assistance', 'Assistance', 'ASSISTANCE', 'aid', 'Aid', 'AID',
  'rescue', 'Rescue', 'RESCUE', 'save', 'Save', 'SAVE', 'emergency', 'Emergency', 'EMERGENCY',
  'सहायता', 'मदद', 'सहायता चाहिए', 'मदद चाहिए',
  'बचाव', 'राहत', 'समर्थन', 'सहयोग',
  'help me', 'Help me', 'HELP ME', 'i need help', 'I need help', 'I NEED HELP',
  'can you help', 'Can you help', 'CAN YOU HELP', 'please help', 'Please help', 'PLEASE HELP',
  'help me please', 'Help me please', 'HELP ME PLEASE',
  'मुझे मदद चाहिए', 'सहायता चाहिए', 'मदद करें'
];

async function testHelpVariations() {
  try {
    console.log('🧪 Testing all "help" variations for support call detection...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp');
    console.log('✅ Connected to database');
    
    // First, send a support prompt to create the context
    const testPhone = '+918130026321';
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
    } else {
      console.log('❌ Failed to send support prompt');
      return;
    }
    
    console.log('\n📋 Testing "help" detection function...\n');
    
    // Test the isHelpRequest function
    function isHelpRequest(text: string): boolean {
      if (!text) return false;
      
      const normalizedText = text.toLowerCase().trim();
      
      // English help variations
      const englishHelp = [
        'help', 'helpp', 'helppp', 'helpppp',
        'support', 'assist', 'assistance',
        'aid', 'rescue', 'save', 'emergency'
      ];
      
      // Hindi help variations
      const hindiHelp = [
        'सहायता', 'मदद', 'सहायता चाहिए', 'मदद चाहिए',
        'बचाव', 'राहत', 'समर्थन', 'सहयोग'
      ];
      
      // Check exact matches
      if (englishHelp.includes(normalizedText) || hindiHelp.includes(normalizedText)) {
        return true;
      }
      
      // Check if text starts with help variations
      for (const help of englishHelp) {
        if (normalizedText.startsWith(help)) {
          return true;
        }
      }
      
      for (const help of hindiHelp) {
        if (normalizedText.startsWith(help)) {
          return true;
        }
      }
      
      // Check for patterns like "help me", "i need help", etc.
      const helpPatterns = [
        /^help\s+/i,
        /^support\s+/i,
        /^assist\s+/i,
        /i\s+need\s+help/i,
        /can\s+you\s+help/i,
        /please\s+help/i,
        /help\s+me/i,
        /मुझे\s+मदद/i,
        /सहायता\s+चाहिए/i
      ];
      
      for (const pattern of helpPatterns) {
        if (pattern.test(normalizedText)) {
          return true;
        }
      }
      
      return false;
    }
    
    // Test each variation
    let detectedCount = 0;
    let totalCount = helpVariations.length;
    
    console.log('Testing individual help variations:');
    console.log('=' .repeat(50));
    
    for (const variation of helpVariations) {
      const isDetected = isHelpRequest(variation);
      const status = isDetected ? '✅ DETECTED' : '❌ NOT DETECTED';
      console.log(`${variation.padEnd(25)} | ${status}`);
      
      if (isDetected) {
        detectedCount++;
      }
    }
    
    console.log('=' .repeat(50));
    console.log(`\n📊 Results: ${detectedCount}/${totalCount} help variations detected (${Math.round(detectedCount/totalCount*100)}%)`);
    
    if (detectedCount === totalCount) {
      console.log('🎉 All "help" variations are properly detected!');
    } else {
      console.log('⚠️ Some variations are not being detected. Check the function logic.');
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Reply with any of these help variations to test the actual webhook');
    console.log('2. Check if the inactive_vendors_reply_to_yes_support_call_util template is sent');
    console.log('3. Verify the support call is logged in the database with requestType: "help_request"');
    
  } catch (error) {
    console.error('❌ Error testing help variations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

testHelpVariations();
