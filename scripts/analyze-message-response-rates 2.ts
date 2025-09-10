import 'dotenv/config';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';

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

async function analyzeMessageResponseRates() {
  try {
    await connectDB();
    
    const now = moment().tz('Asia/Kolkata');
    const todayStart = now.clone().startOf('day').toDate();
    const todayEnd = now.clone().endOf('day').toDate();
    
    console.log(`📅 Analysis for: ${now.format('YYYY-MM-DD')} (Today)`);
    console.log(`🕐 Current time: ${now.format('YYYY-MM-DD HH:mm:ss')} IST\n`);
    
    // ===== ANALYSIS 1: update_location_cron_util messages =====
    console.log('🔍 ANALYSIS 1: Location Update Reminders (update_location_cron_util)');
    console.log('=' .repeat(60));
    
    // Find all outbound messages with update_location_cron_util template today
    const locationReminderMessages = await Message.find({
      direction: 'outbound',
      timestamp: { $gte: todayStart, $lt: todayEnd },
      $or: [
        { body: { $regex: /update_location_cron_util/i } },
        { 'meta.reminderType': { $regex: /vendor_location/i } }
      ]
    }).sort({ timestamp: -1 });
    
    console.log(`📤 Total location reminder messages sent today: ${locationReminderMessages.length}`);
    
    if (locationReminderMessages.length > 0) {
      console.log('\n📋 Location reminder messages sent:');
      locationReminderMessages.forEach((msg, i) => {
        console.log(`${i+1}. ${msg.timestamp.toLocaleString('en-IN')} | ${msg.to} | ${msg.meta?.vendorName || 'Unknown'}`);
      });
    }
    
    // Find responses to location reminder messages
    const locationReminderRecipients = locationReminderMessages.map(msg => msg.to);
    const locationResponses = await Message.find({
      direction: 'inbound',
      timestamp: { $gte: todayStart, $lt: todayEnd },
      from: { $in: locationReminderRecipients }
    });
    
    console.log(`\n📥 Total responses to location reminders today: ${locationResponses.length}`);
    
    if (locationResponses.length > 0) {
      console.log('\n📋 Responses received:');
      locationResponses.forEach((msg, i) => {
        console.log(`${i+1}. ${msg.timestamp.toLocaleString('en-IN')} | ${msg.from} | ${msg.body?.substring(0, 50) || 'Location/Media'}`);
      });
    }
    
    // Calculate response rate
    const locationResponseRate = locationReminderMessages.length > 0 
      ? ((locationResponses.length / locationReminderMessages.length) * 100).toFixed(2)
      : '0.00';
    
    console.log(`\n📊 Location Reminder Response Rate: ${locationResponseRate}%`);
    console.log(`   - Messages sent: ${locationReminderMessages.length}`);
    console.log(`   - Responses received: ${locationResponses.length}`);
    console.log(`   - No response: ${locationReminderMessages.length - locationResponses.length}`);
    
    // ===== ANALYSIS 2: inactive_vendors_support_prompt_util messages =====
    console.log('\n\n🔍 ANALYSIS 2: Inactive Vendor Support Prompts (inactive_vendors_support_prompt_util)');
    console.log('=' .repeat(60));
    
    // Find all outbound messages with inactive_vendors_support_prompt_util template today
    const supportPromptMessages = await Message.find({
      direction: 'outbound',
      timestamp: { $gte: todayStart, $lt: todayEnd },
      $or: [
        { body: { $regex: /inactive_vendors_support_prompt_util/i } },
        { 'meta.campaign': { $regex: /support/i } }
      ]
    }).sort({ timestamp: -1 });
    
    console.log(`📤 Total support prompt messages sent today: ${supportPromptMessages.length}`);
    
    if (supportPromptMessages.length > 0) {
      console.log('\n📋 Support prompt messages sent:');
      supportPromptMessages.forEach((msg, i) => {
        console.log(`${i+1}. ${msg.timestamp.toLocaleString('en-IN')} | ${msg.to} | ${msg.meta?.vendorName || 'Unknown'}`);
      });
    }
    
    // Find responses to support prompt messages
    const supportPromptRecipients = supportPromptMessages.map(msg => msg.to);
    const supportResponses = await Message.find({
      direction: 'inbound',
      timestamp: { $gte: todayStart, $lt: todayEnd },
      from: { $in: supportPromptRecipients }
    });
    
    console.log(`\n📥 Total responses to support prompts today: ${supportResponses.length}`);
    
    if (supportResponses.length > 0) {
      console.log('\n📋 Responses received:');
      supportResponses.forEach((msg, i) => {
        console.log(`${i+1}. ${msg.timestamp.toLocaleString('en-IN')} | ${msg.from} | ${msg.body?.substring(0, 50) || 'Location/Media'}`);
      });
    }
    
    // Calculate response rate
    const supportResponseRate = supportPromptMessages.length > 0 
      ? ((supportResponses.length / supportPromptMessages.length) * 100).toFixed(2)
      : '0.00';
    
    console.log(`\n📊 Support Prompt Response Rate: ${supportResponseRate}%`);
    console.log(`   - Messages sent: ${supportPromptMessages.length}`);
    console.log(`   - Responses received: ${supportResponses.length}`);
    console.log(`   - No response: ${supportPromptMessages.length - supportResponses.length}`);
    
    // ===== ANALYSIS 3: Overall vendor activity =====
    console.log('\n\n🔍 ANALYSIS 3: Overall Vendor Activity Today');
    console.log('=' .repeat(60));
    
    // Get total vendors with WhatsApp consent
    const totalVendors = await User.countDocuments({
      whatsappConsent: true,
      contactNumber: { $exists: true, $nin: [null, ''] }
    });
    
    // Get all outbound messages today
    const allOutboundToday = await Message.find({
      direction: 'outbound',
      timestamp: { $gte: todayStart, $lt: todayEnd }
    });
    
    // Get all inbound messages today
    const allInboundToday = await Message.find({
      direction: 'inbound',
      timestamp: { $gte: todayStart, $lt: todayEnd }
    });
    
    console.log(`👥 Total vendors with WhatsApp consent: ${totalVendors}`);
    console.log(`📤 Total outbound messages sent today: ${allOutboundToday.length}`);
    console.log(`📥 Total inbound messages received today: ${allInboundToday.length}`);
    
    // Get unique vendors who sent messages today
    const uniqueActiveVendors = new Set(
      allInboundToday.map(msg => (msg.from || '').replace(/^whatsapp:/, ''))
    );
    
    console.log(`🎯 Unique vendors who sent messages today: ${uniqueActiveVendors.size}`);
    console.log(`📊 Overall vendor activity rate: ${((uniqueActiveVendors.size / totalVendors) * 100).toFixed(2)}%`);
    
    // ===== ANALYSIS 4: Recent activity (last 7 days) =====
    console.log('\n\n🔍 ANALYSIS 4: Recent Activity (Last 7 Days)');
    console.log('=' .repeat(60));
    
    const sevenDaysAgo = now.clone().subtract(7, 'days').startOf('day').toDate();
    
    const recentOutbound = await Message.find({
      direction: 'outbound',
      timestamp: { $gte: sevenDaysAgo }
    }).sort({ timestamp: -1 });
    
    const recentInbound = await Message.find({
      direction: 'inbound',
      timestamp: { $gte: sevenDaysAgo }
    }).sort({ timestamp: -1 });
    
    console.log(`📤 Total outbound messages (last 7 days): ${recentOutbound.length}`);
    console.log(`📥 Total inbound messages (last 7 days): ${recentInbound.length}`);
    
    // Get unique vendors who sent messages in last 7 days
    const uniqueActiveVendors7Days = new Set(
      recentInbound.map(msg => (msg.from || '').replace(/^whatsapp:/, ''))
    );
    
    console.log(`🎯 Unique vendors who sent messages (last 7 days): ${uniqueActiveVendors7Days.size}`);
    console.log(`📊 7-day vendor activity rate: ${((uniqueActiveVendors7Days.size / totalVendors) * 100).toFixed(2)}%`);
    
    // ===== SUMMARY =====
    console.log('\n\n📋 SUMMARY');
    console.log('=' .repeat(60));
    console.log(`📅 Date: ${now.format('YYYY-MM-DD')}`);
    console.log(`👥 Total vendors: ${totalVendors}`);
    console.log(`📤 Location reminders sent: ${locationReminderMessages.length}`);
    console.log(`📥 Location reminder responses: ${locationResponses.length} (${locationResponseRate}%)`);
    console.log(`📤 Support prompts sent: ${supportPromptMessages.length}`);
    console.log(`📥 Support prompt responses: ${supportResponses.length} (${supportResponseRate}%)`);
    console.log(`🎯 Active vendors today: ${uniqueActiveVendors.size}`);
    console.log(`🎯 Active vendors (7 days): ${uniqueActiveVendors7Days.size}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

analyzeMessageResponseRates();
