import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { User } from '../server/models/User.js';
import { Contact } from '../server/models/Contact.js';
import { Message } from '../server/models/Message.js';
import { DispatchLog } from '../server/models/DispatchLog.js';
import { sendTemplateMessage } from '../server/meta.js';

// Connect to MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';
await mongoose.connect(MONGO_URI);
console.log('✅ Connected to MongoDB');

// Check Meta credentials
function checkMetaCredentials() {
  console.log('\n🔍 Checking Meta WhatsApp API credentials:');
  console.log('META_ACCESS_TOKEN:', process.env.META_ACCESS_TOKEN ? '✅ Set' : '❌ Missing');
  console.log('META_PHONE_NUMBER_ID:', process.env.META_PHONE_NUMBER_ID ? '✅ Set' : '❌ Missing');
  console.log('META_API_VERSION:', process.env.META_API_VERSION || 'v19.0 (default)');
  
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.log('❌ Meta credentials are not configured!');
    return false;
  }
  return true;
}

// Check current time and vendor operating hours
async function checkVendorOperatingHours() {
  console.log('\n🕐 Checking current time and vendor operating hours:');
  const now = moment().tz('Asia/Kolkata');
  const currentTime = now.hour() * 60 + now.minute();
  const currentDay = now.day();
  
  console.log(`Current time: ${now.format('YYYY-MM-DD HH:mm:ss')} IST`);
  console.log(`Current day: ${currentDay} (0=Sunday, 1=Monday, etc.)`);
  console.log(`Current time in minutes: ${currentTime}`);
  
  // Get all vendors
  const vendors = await User.find({ 
    whatsappConsent: true,
    contactNumber: { $exists: true, $nin: [null, ''] },
    operatingHours: { $exists: true, $ne: null }
  }).select('_id name contactNumber operatingHours').lean();
  
  console.log(`\n📊 Found ${vendors.length} vendors with WhatsApp consent and operating hours`);
  
  let activeToday = 0;
  let withValidOpenTime = 0;
  
  for (const vendor of vendors) {
    const operatingHours = vendor.operatingHours as any;
    
    // Check if vendor is open today
    if (operatingHours.days && operatingHours.days.includes(currentDay)) {
      activeToday++;
      
      // Parse open time
      try {
        const openTime = moment.tz(operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
        
        if (openTime.isValid()) {
          withValidOpenTime++;
          
          openTime.set({
            year: now.year(),
            month: now.month(),
            date: now.date(),
          });
          
          const diff = openTime.diff(now, 'minutes');
          
          console.log(`\n🏪 ${vendor.name} (${vendor.contactNumber}):`);
          console.log(`   Operating hours: ${JSON.stringify(operatingHours)}`);
          console.log(`   Open time: ${openTime.format('YYYY-MM-DD HH:mm:ss')} IST`);
          console.log(`   Minutes until open: ${diff}`);
          console.log(`   Should send at -15min: ${diff === 15 ? '✅ YES' : '❌ NO'}`);
          console.log(`   Should send at open: ${diff === 0 ? '✅ YES' : '❌ NO'}`);
        } else {
          console.log(`\n❌ ${vendor.name}: Invalid open time format: ${operatingHours.openTime}`);
        }
      } catch (error) {
        console.log(`\n❌ ${vendor.name}: Error parsing open time: ${error.message}`);
      }
    }
  }
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total vendors: ${vendors.length}`);
  console.log(`   Active today: ${activeToday}`);
  console.log(`   With valid open time: ${withValidOpenTime}`);
}

// Check recent dispatch logs
async function checkDispatchLogs() {
  console.log('\n📋 Checking recent dispatch logs:');
  const today = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
  
  const todayDispatches = await DispatchLog.find({
    date: today
  }).populate('vendorId', 'name contactNumber').sort({ createdAt: -1 });
  
  console.log(`Found ${todayDispatches.length} dispatches today (${today}):`);
  
  for (const dispatch of todayDispatches) {
    const vendor = dispatch.vendorId as any;
    console.log(`   ${dispatch.type} to ${vendor?.name || 'Unknown'} (${vendor?.contactNumber || 'Unknown'}) at ${dispatch.createdAt}`);
  }
}

// Check recent messages
async function checkRecentMessages() {
  console.log('\n💬 Checking recent update_location_cron messages:');
  const today = moment().tz('Asia/Kolkata').startOf('day').toDate();
  
  const recentMessages = await Message.find({
    body: { $regex: 'update_location_cron_util', $options: 'i' },
    timestamp: { $gte: today }
  }).sort({ timestamp: -1 }).limit(10);
  
  console.log(`Found ${recentMessages.length} update_location_cron messages today:`);
  
  for (const message of recentMessages) {
    console.log(`   To: ${message.to} at ${message.timestamp} - ${message.body}`);
  }
}

// Test Meta API connection
async function testMetaAPI() {
  console.log('\n🧪 Testing Meta WhatsApp API connection:');
  
  if (!checkMetaCredentials()) {
    return;
  }
  
  try {
    // Try to send a test message (this will fail but show if API is reachable)
    const result = await sendTemplateMessage('+1234567890', 'test_template');
    console.log('Meta API test result:', result);
  } catch (error) {
    console.log('Meta API test error (expected for invalid number):', error.message);
  }
}

// Main execution
async function main() {
  try {
    await checkMetaCredentials();
    await checkVendorOperatingHours();
    await checkDispatchLogs();
    await checkRecentMessages();
    await testMetaAPI();
    
    console.log('\n✅ Debug complete!');
  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
