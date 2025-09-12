import 'dotenv/config';
import mongoose from 'mongoose';
import { Message } from '../server/models/Message.js';
import { sendTemplateMessage } from '../server/meta.js';

// Test all variations of "yes" responses
const yesVariations = [
  'yes', 'Yes', 'YES', 'yess', 'Yess', 'YESS', 'yesss', 'Yesss', 'YESSS',
  'yeah', 'Yeah', 'YEAH', 'yea', 'Yea', 'YEA',
  'yep', 'Yep', 'YEP', 'yup', 'Yup', 'YUP',
  'ya', 'Ya', 'YA', 'yah', 'Yah', 'YAH',
  'ok', 'Ok', 'OK', 'okay', 'Okay', 'OKAY',
  'okey', 'Okey', 'OKEY', 'sure', 'Sure', 'SURE',
  'alright', 'Alright', 'ALRIGHT',
  'हाँ', 'हां', 'हा', 'हान', 'हान्',
  'जी', 'जी हाँ', 'जी हां', 'जी हा',
  'ठीक', 'ठीक है', 'बिल्कुल', 'सही',
  'yes i need help', 'Yes please', 'YESS call me',
  'हाँ मुझे मदद चाहिए', 'जी हाँ कॉल करें'
];

async function testYesVariations() {
  try {
    console.log('🧪 Testing all "yes" variations for support call detection...\n');
    
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
    
    console.log('\n📋 Testing "yes" detection function...\n');
    
    // Test the isYesResponse function
    function isYesResponse(text: string): boolean {
      if (!text) return false;
      
      const normalizedText = text.toLowerCase().trim();
      
      // English variations
      const englishYes = [
        'yes', 'yess', 'yesss', 'yessss', 'yesssss',
        'yeah', 'yea', 'yep', 'yup', 'ya', 'yah',
        'ok', 'okay', 'okey', 'sure', 'alright'
      ];
      
      // Hindi variations
      const hindiYes = [
        'हाँ', 'हां', 'हा', 'हान', 'हान्',
        'जी', 'जी हाँ', 'जी हां', 'जी हा',
        'ठीक', 'ठीक है', 'बिल्कुल', 'सही'
      ];
      
      // Check exact matches
      if (englishYes.includes(normalizedText) || hindiYes.includes(normalizedText)) {
        return true;
      }
      
      // Check if text starts with yes variations
      for (const yes of englishYes) {
        if (normalizedText.startsWith(yes)) {
          return true;
        }
      }
      
      for (const yes of hindiYes) {
        if (normalizedText.startsWith(yes)) {
          return true;
        }
      }
      
      // Check for patterns like "yes i need help", "yes please", etc.
      const yesPatterns = [
        /^yes\s+/i,
        /^yeah\s+/i,
        /^yep\s+/i,
        /^yup\s+/i,
        /^हाँ\s+/i,
        /^हां\s+/i,
        /^जी\s+/i
      ];
      
      for (const pattern of yesPatterns) {
        if (pattern.test(normalizedText)) {
          return true;
        }
      }
      
      return false;
    }
    
    // Test each variation
    let detectedCount = 0;
    let totalCount = yesVariations.length;
    
    console.log('Testing individual variations:');
    console.log('=' .repeat(50));
    
    for (const variation of yesVariations) {
      const isDetected = isYesResponse(variation);
      const status = isDetected ? '✅ DETECTED' : '❌ NOT DETECTED';
      console.log(`${variation.padEnd(25)} | ${status}`);
      
      if (isDetected) {
        detectedCount++;
      }
    }
    
    console.log('=' .repeat(50));
    console.log(`\n📊 Results: ${detectedCount}/${totalCount} variations detected (${Math.round(detectedCount/totalCount*100)}%)`);
    
    if (detectedCount === totalCount) {
      console.log('🎉 All "yes" variations are properly detected!');
    } else {
      console.log('⚠️ Some variations are not being detected. Check the function logic.');
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Reply with any of these variations to test the actual webhook');
    console.log('2. Check if the inactive_vendors_reply_to_yes_support_call_util template is sent');
    console.log('3. Verify the support call is logged in the database');
    
  } catch (error) {
    console.error('❌ Error testing yes variations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

testYesVariations();
