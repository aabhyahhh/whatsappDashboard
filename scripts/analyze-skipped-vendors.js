// Script to analyze skipped vendors from template message campaign
import 'dotenv/config';
import { connectDB } from '../server/db.ts';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';

const TEMPLATE_SID = 'HX28255a1eaec85af72ae2c94551299ffb';

console.log('🔍 Analyzing Skipped Vendors from Template Message Campaign');
console.log('==========================================================');
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
console.log('📊 Finding all vendors with WhatsApp consent...');
const allUsers = await User.find({ 
  whatsappConsent: true,
  contactNumber: { $exists: true, $ne: null, $ne: '' }
});

console.log(`📊 Found ${allUsers.length} total vendors with WhatsApp consent.`);
console.log('');

// Get today's date range
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

// Analyze each vendor
console.log('🔍 Analyzing each vendor...');
console.log('');

let skippedVendors = [];
let validVendors = [];

for (const user of allUsers) {
  const contact = user.contactNumber;
  let skipReason = null;
  
  // Check for invalid contact numbers
  if (!contact || typeof contact !== 'string' || contact.length < 10) {
    skipReason = `Invalid contact number: "${contact}"`;
  } else {
    // Check if message was already sent today
    const existingMessage = await Message.findOne({
      to: contact,
      body: TEMPLATE_SID,
      timestamp: { $gte: today, $lt: tomorrow }
    });
    
    if (existingMessage) {
      skipReason = `Message already sent today at ${existingMessage.timestamp.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
    }
  }
  
  if (skipReason) {
    skippedVendors.push({
      name: user.name || 'Unknown',
      contactNumber: contact,
      reason: skipReason,
      userId: user._id
    });
  } else {
    validVendors.push({
      name: user.name || 'Unknown',
      contactNumber: contact,
      userId: user._id
    });
  }
}

// Display results
console.log('📋 SKIPPED VENDORS ANALYSIS');
console.log('===========================');
console.log(`Total vendors analyzed: ${allUsers.length}`);
console.log(`Skipped vendors: ${skippedVendors.length}`);
console.log(`Valid vendors (would receive message): ${validVendors.length}`);
console.log('');

if (skippedVendors.length > 0) {
  console.log('❌ SKIPPED VENDORS LIST:');
  console.log('=======================');
  
  // Group by reason
  const groupedByReason = {};
  skippedVendors.forEach(vendor => {
    if (!groupedByReason[vendor.reason]) {
      groupedByReason[vendor.reason] = [];
    }
    groupedByReason[vendor.reason].push(vendor);
  });
  
  Object.keys(groupedByReason).forEach(reason => {
    const vendors = groupedByReason[reason];
    console.log(`\n🔍 ${reason} (${vendors.length} vendors):`);
    console.log('-'.repeat(50));
    
    vendors.forEach((vendor, index) => {
      console.log(`${index + 1}. ${vendor.name} (${vendor.contactNumber})`);
    });
  });
  
  console.log('\n📊 SKIP REASON SUMMARY:');
  console.log('=======================');
  Object.keys(groupedByReason).forEach(reason => {
    const count = groupedByReason[reason].length;
    console.log(`• ${reason}: ${count} vendors`);
  });
} else {
  console.log('✅ No vendors were skipped!');
}

console.log('');

if (validVendors.length > 0) {
  console.log('✅ VALID VENDORS (Would receive message):');
  console.log('=========================================');
  console.log(`Total: ${validVendors.length} vendors`);
  
  // Show first 10 valid vendors as sample
  if (validVendors.length <= 10) {
    validVendors.forEach((vendor, index) => {
      console.log(`${index + 1}. ${vendor.name} (${vendor.contactNumber})`);
    });
  } else {
    console.log('Sample of first 10:');
    validVendors.slice(0, 10).forEach((vendor, index) => {
      console.log(`${index + 1}. ${vendor.name} (${vendor.contactNumber})`);
    });
    console.log(`... and ${validVendors.length - 10} more`);
  }
}

console.log('');
console.log('📊 DETAILED BREAKDOWN:');
console.log('======================');

// Additional analysis
const invalidContactNumbers = skippedVendors.filter(v => v.reason.includes('Invalid contact number'));
const alreadySentToday = skippedVendors.filter(v => v.reason.includes('already sent today'));

console.log(`• Invalid contact numbers: ${invalidContactNumbers.length}`);
console.log(`• Already sent today: ${alreadySentToday.length}`);
console.log(`• Total skipped: ${skippedVendors.length}`);

if (invalidContactNumbers.length > 0) {
  console.log('\n🔧 RECOMMENDATIONS:');
  console.log('==================');
  console.log('1. Fix invalid contact numbers in the database');
  console.log('2. Remove test/placeholder contact numbers');
  console.log('3. Ensure all vendors have valid WhatsApp numbers');
}

console.log('');
console.log('✅ Analysis completed!');

// Close database connection
process.exit(0);
