// twilio.ts - Fixed implementation
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log('🔍 Twilio credentials check:');
console.log('Account SID exists:', !!accountSid);
console.log('Auth Token exists:', !!authToken);
console.log('Account SID length:', accountSid?.length || 0);
console.log('Auth Token length:', authToken?.length || 0);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Add validation for credential format
if (accountSid && !accountSid.startsWith('AC')) {
  console.error('❌ Invalid Account SID format - should start with AC');
}

if (authToken && authToken.length < 30) {
  console.error('❌ Auth Token seems too short - expected 32+ characters');
}

let client: twilio.Twilio | null = null;

// Create a fresh client function instead of reusing global
const createFreshClient = (): twilio.Twilio | null => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  
  if (!sid || !token) {
    console.error('❌ Missing Twilio credentials for fresh client');
    return null;
  }
  
  try {
    return twilio(sid, token);
  } catch (error) {
    console.error('❌ Failed to create fresh Twilio client:', error);
    return null;
  }
};

if (accountSid && authToken) {
  try {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized successfully');
    
    // Test the client immediately after creation
    client.api.accounts(accountSid).fetch()
      .then(() => console.log('✅ Twilio credentials verified successfully'))
      .catch((error) => console.error('❌ Twilio credential verification failed:', error));
      
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error);
    client = null;
  }
} else {
  console.error('❌ Twilio client not initialized - missing credentials');
  console.error('Account SID:', accountSid ? 'Present' : 'Missing');
  console.error('Auth Token:', authToken ? 'Present' : 'Missing');
}

export { client, createFreshClient };