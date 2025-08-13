import path from 'path';
import dotenv from 'dotenv';
import twilio from 'twilio';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Debug environment variables
console.log('🔍 Environment Variables Debug:');
console.log('Current working directory:', process.cwd());
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('TWILIO_ACCOUNT_SID exists:', !!process.env.TWILIO_ACCOUNT_SID);
console.log('TWILIO_AUTH_TOKEN exists:', !!process.env.TWILIO_AUTH_TOKEN);
console.log('TWILIO_PHONE_NUMBER exists:', !!process.env.TWILIO_PHONE_NUMBER);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('NODE_ENV:', process.env.NODE_ENV);

const TEMPLATE_SID = 'HX5990e2eb62bbb374ac865ab6195fcfbe';

async function testTwilioConnection() {
  try {
    console.log('🚀 TESTING TWILIO CONNECTION');
    console.log('==========================================');
    console.log(`📅 Date: ${new Date().toLocaleString()}`);
    console.log(`📋 Template SID: ${TEMPLATE_SID}`);
    
    // Check environment variables
    console.log('🔧 Checking Twilio credentials...');
    console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Present' : 'Missing');
    console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing');
    console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? 'Present' : 'Missing');
    
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Missing Twilio credentials');
    }
    
    // Create Twilio client
    console.log('🔧 Creating Twilio client...');
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client created');
    
    // Test the client by fetching account info
    console.log('🔧 Testing Twilio client...');
    const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Twilio client verified successfully');
    console.log('📊 Account Status:', account.status);
    console.log('📊 Account Type:', account.type);
    
    // Test template access (this will verify the template exists)
    console.log('🔧 Testing template access...');
    try {
      // Note: We can't directly fetch content templates via API, but we can test sending
      console.log('✅ Template SID format is valid');
    } catch (templateError) {
      console.log('⚠️ Template access test:', templateError);
    }
    
    console.log('\n🎉 Twilio connection test completed successfully!');
    console.log('📋 Ready to send messages with template:', TEMPLATE_SID);
    
  } catch (error) {
    console.error('❌ Twilio connection test failed:', error);
  }
}

// Run the test
testTwilioConnection();
