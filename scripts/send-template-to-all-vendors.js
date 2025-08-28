// Script to send template message to all vendors
import 'dotenv/config';
import { connectDB } from '../server/db.ts';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import { createFreshClient } from '../server/twilio.js';

const TEMPLATE_SID = 'HX28255a1eaec85af72ae2c94551299ffb';

console.log('🚀 Starting template message campaign...');
console.log(`📅 Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
console.log(`📋 Template SID: ${TEMPLATE_SID}`);
console.log('');

// Connect to database
console.log('🔌 Connecting to database...');
try {
  await connectDB();
  console.log('✅ Database connected successfully');
} catch (error) {
  console.log('❌ Database connection failed:', error.message);
  process.exit(1);
}

console.log('');

// Find all users with WhatsApp consent
console.log('📊 Finding vendors with WhatsApp consent...');
const users = await User.find({ 
  whatsappConsent: true,
  contactNumber: { $exists: true, $ne: null, $ne: '' }
});

console.log(`📊 Found ${users.length} vendors with WhatsApp consent.`);
console.log('');

if (users.length === 0) {
  console.log('⚠️ No vendors found with WhatsApp consent. Exiting...');
  process.exit(0);
}

// Initialize Twilio client
console.log('📱 Initializing Twilio client...');
const twilioClient = createFreshClient();
if (!twilioClient) {
  console.error('❌ Twilio client not available - exiting');
  process.exit(1);
}
console.log('✅ Twilio client initialized successfully');
console.log('');

// Send messages
console.log('📤 Starting message sending process...');
console.log('');

let sent = 0;
let failed = 0;
let skipped = 0;
let total = users.length;

for (const user of users) {
  const contact = user.contactNumber;
  
  // Skip users without valid contact numbers
  if (!contact || typeof contact !== 'string' || contact.length < 10) {
    console.warn(`⚠️ Skipping user ${user._id} - invalid contact number: ${contact}`);
    skipped++;
    continue;
  }
  
  // Check if message was already sent today to this user
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const existingMessage = await Message.findOne({
    to: contact,
    body: TEMPLATE_SID,
    timestamp: { $gte: today, $lt: tomorrow }
  });
  
  if (existingMessage) {
    console.log(`⏩ Skipping ${contact} (${user.name || 'Unknown'}) - message already sent today`);
    skipped++;
    continue;
  }
  
  try {
    console.log(`📤 Sending to ${contact} (${user.name || 'Unknown'})...`);
    
    // Send WhatsApp message
    const result = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${contact}`,
      contentSid: TEMPLATE_SID,
      contentVariables: JSON.stringify({}),
    });
    
    // Save message to database
    await Message.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: contact,
      body: TEMPLATE_SID,
      direction: 'outbound',
      timestamp: new Date(),
      meta: { 
        campaign: 'template-message-campaign',
        templateSid: TEMPLATE_SID,
        vendorName: user.name,
        date: new Date().toISOString().split('T')[0]
      },
      twilioSid: result.sid
    });
    
    sent++;
    console.log(`✅ Sent successfully to ${contact} (${user.name || 'Unknown'}) - SID: ${result.sid}`);
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (err) {
    failed++;
    console.error(`❌ Failed to send to ${contact} (${user.name || 'Unknown'}):`, err.message || err);
  }
  
  // Progress update every 10 messages
  if ((sent + failed + skipped) % 10 === 0) {
    console.log(`📊 Progress: ${sent + failed + skipped}/${total} processed`);
  }
}

console.log('');
console.log('📊 Campaign Summary:');
console.log('===================');
console.log(`✅ Successfully sent: ${sent}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⏩ Skipped: ${skipped}`);
console.log(`📊 Total processed: ${sent + failed + skipped}`);
console.log(`📊 Total vendors: ${total}`);

if (failed > 0) {
  console.log('');
  console.log('⚠️ Some messages failed to send. Check the logs above for details.');
}

console.log('');
console.log('✅ Template message campaign completed!');

// Close database connection
process.exit(0);
