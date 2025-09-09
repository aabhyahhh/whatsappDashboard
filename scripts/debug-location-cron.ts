import 'dotenv/config';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import { sendTemplateMessage } from '../server/meta.js';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Helper to check if vendor has shared location today
async function hasLocationToday(contactNumber: string): Promise<boolean> {
  const todayStart = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const todayEnd = moment().tz('Asia/Kolkata').endOf('day').toDate();
  
  const locationMessage = await Message.findOne({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    direction: 'inbound',
    timestamp: { $gte: todayStart, $lt: todayEnd },
    $or: [
      { 'location.latitude': { $exists: true } },
      { body: { $regex: /location|shared|updated|sent/i } }
    ]
  });
  
  return !!locationMessage;
}

async function debugLocationCron() {
  try {
    await connectDB();
    
    const now = moment().tz('Asia/Kolkata');
    console.log(`🕐 Current time: ${now.format('YYYY-MM-DD HH:mm:ss')} IST`);
    console.log(`📅 Day of week: ${now.day()} (0=Sunday, 1=Monday, etc.)`);
    
    // Check Meta credentials
    console.log('\n🔑 Meta WhatsApp API Configuration:');
    console.log(`- META_ACCESS_TOKEN: ${process.env.META_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`- META_PHONE_NUMBER_ID: ${process.env.META_PHONE_NUMBER_ID ? '✅ Set' : '❌ Missing'}`);
    
    if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
      console.log('❌ Cannot proceed without Meta WhatsApp credentials');
      return;
    }
    
    const currentTime = now.hour() * 60 + now.minute(); // Current time in minutes
    const currentDay = now.day(); // 0 = Sunday, 1 = Monday, etc.
    const todayDate = now.format('YYYY-MM-DD');
    
    // Get all vendors with operating hours and WhatsApp consent
    const vendors = await User.find({ 
      whatsappConsent: true,
      contactNumber: { $exists: true, $nin: [null, ''] },
      operatingHours: { $exists: true, $ne: null }
    }).select('_id name contactNumber operatingHours').lean();
    
    console.log(`\n📊 Found ${vendors.length} vendors with operating hours and WhatsApp consent`);
    
    let vendorsInRange = 0;
    let vendorsWithValidTimes = 0;
    let vendorsOpenToday = 0;
    
    for (const vendor of vendors) {
      if (!vendor.operatingHours) {
        continue;
      }
      
      // Check if vendor is open today
      const operatingHours = vendor.operatingHours as any;
      if (!operatingHours.days || !operatingHours.days.includes(currentDay)) {
        continue;
      }
      
      vendorsOpenToday++;
      
      // Parse open time with multiple format support
      let openTime;
      try {
        openTime = moment.tz(operatingHours.openTime, ['h:mm A', 'HH:mm', 'H:mm'], 'Asia/Kolkata');
        
        if (!openTime.isValid()) {
          console.log(`⚠️ Invalid open time for ${vendor.contactNumber}: ${operatingHours.openTime}`);
          continue;
        }
      } catch (timeError) {
        console.error(`❌ Error parsing time for ${vendor.contactNumber}:`, timeError.message);
        continue;
      }
      
      vendorsWithValidTimes++;
      
      openTime.set({
        year: now.year(),
        month: now.month(),
        date: now.date(),
      });
      
      const diff = openTime.diff(now, 'minutes');
      
      // Check if vendor has already shared location today
      const hasLocation = await hasLocationToday(vendor.contactNumber);
      
      console.log(`\n👤 ${vendor.name} (${vendor.contactNumber})`);
      console.log(`   - Operating hours: ${operatingHours.openTime}`);
      console.log(`   - Days open: ${operatingHours.days}`);
      console.log(`   - Open time today: ${openTime.format('HH:mm')}`);
      console.log(`   - Minutes until open: ${diff}`);
      console.log(`   - Has location today: ${hasLocation ? '✅ Yes' : '❌ No'}`);
      
      // Check if vendor is in the reminder range (15 minutes before or at opening)
      if (diff === 15 || diff === 0) {
        vendorsInRange++;
        console.log(`   🎯 IN REMINDER RANGE! Should get ${diff === 15 ? '15-min' : 'open-time'} reminder`);
        
        if (hasLocation) {
          console.log(`   ⏩ Would be skipped - location already shared today`);
        } else {
          console.log(`   📤 Would send reminder now`);
        }
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`- Total vendors with consent: ${vendors.length}`);
    console.log(`- Vendors open today: ${vendorsOpenToday}`);
    console.log(`- Vendors with valid times: ${vendorsWithValidTimes}`);
    console.log(`- Vendors in reminder range (15min or open): ${vendorsInRange}`);
    
    // Check recent messages
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMessages = await Message.find({
      timestamp: { $gte: sevenDaysAgo },
      direction: 'outbound'
    }).sort({ timestamp: -1 }).limit(10);
    
    console.log(`\n📨 Recent outbound messages (last 7 days): ${recentMessages.length}`);
    recentMessages.forEach((msg, i) => {
      console.log(`${i+1}. ${msg.timestamp.toLocaleString('en-IN')} | ${msg.to} | ${msg.body?.substring(0, 50) || 'Template message'}`);
    });
    
    // Check inbound messages
    const recentInbound = await Message.find({
      timestamp: { $gte: sevenDaysAgo },
      direction: 'inbound'
    }).sort({ timestamp: -1 }).limit(10);
    
    console.log(`\n📥 Recent inbound messages (last 7 days): ${recentInbound.length}`);
    recentInbound.forEach((msg, i) => {
      console.log(`${i+1}. ${msg.timestamp.toLocaleString('en-IN')} | ${msg.from} | ${msg.body?.substring(0, 50) || 'Location/Media'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debugLocationCron();