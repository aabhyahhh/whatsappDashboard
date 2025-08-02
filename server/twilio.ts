import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log('🔍 Twilio credentials check:');
console.log('Account SID exists:', !!accountSid);
console.log('Auth Token exists:', !!authToken);
console.log('Account SID length:', accountSid?.length || 0);
console.log('Auth Token length:', authToken?.length || 0);
console.log('NODE_ENV:', process.env.NODE_ENV);

let client: twilio.Twilio | null = null;

if (accountSid && authToken) {
  try {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error);
    client = null;
  }
} else {
  console.error('❌ Twilio client not initialized - missing credentials');
  console.error('Account SID:', accountSid ? 'Present' : 'Missing');
  console.error('Auth Token:', authToken ? 'Present' : 'Missing');
}

export { client }; 