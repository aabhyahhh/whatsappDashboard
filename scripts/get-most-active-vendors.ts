import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Import models
import { User } from '../server/models/User.js';
import { Message } from '../server/models/Message.js';
import LoanReplyLog from '../server/models/LoanReplyLog.js';

interface VendorActivity {
  vendor: any;
  messageCount: number;
  lastActivity: Date;
  firstActivity: Date;
  loanInterest: boolean;
  aadharVerified: boolean;
  whatsappConsent: boolean;
  contactNumber: string;
  name: string;
  location?: any;
  operatingHours?: any;
  status?: string;
  createdAt?: Date;
  aadharVerificationDate?: Date;
}

async function getMostActiveVendors() {
  try {
    console.log('📊 Analyzing most active vendors on Laari Khojo WhatsApp...');
    console.log('========================================================');
    
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get all inbound messages (vendor interactions)
    const inboundMessages = await Message.find({
      direction: 'inbound'
    }).select('from timestamp body').lean();
    
    console.log(`📊 Found ${inboundMessages.length} inbound messages`);
    
    // Group messages by vendor phone number
    const vendorActivityMap = new Map<string, any[]>();
    
    for (const message of inboundMessages) {
      if (message.from) {
        // Normalize phone number (remove whatsapp: prefix)
        const phoneNumber = message.from.replace(/^whatsapp:/, '');
        if (!vendorActivityMap.has(phoneNumber)) {
          vendorActivityMap.set(phoneNumber, []);
        }
        vendorActivityMap.get(phoneNumber)!.push(message);
      }
    }
    
    console.log(`📊 Found ${vendorActivityMap.size} unique vendors with activity`);
    
    // Get all users/vendors from database
    const allUsers = await User.find({}).lean();
    console.log(`📊 Found ${allUsers.length} total users in database`);
    
    // Create vendor activity data
    const vendorActivities: VendorActivity[] = [];
    
    for (const [phoneNumber, messages] of vendorActivityMap) {
      // Find corresponding user
      const user = allUsers.find(u => {
        const userPhone = u.contactNumber;
        if (!userPhone) return false;
        
        // Match different phone number formats
        return userPhone === phoneNumber ||
               userPhone.replace(/^\+91/, '91') === phoneNumber ||
               userPhone.replace(/^\+/, '') === phoneNumber ||
               userPhone.slice(-10) === phoneNumber.slice(-10);
      });
      
      if (user) {
        // Sort messages by timestamp
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        const firstActivity = sortedMessages[0].timestamp;
        const lastActivity = sortedMessages[sortedMessages.length - 1].timestamp;
        
        // Check if vendor has shown loan interest
        const loanReply = await LoanReplyLog.findOne({
          contactNumber: user.contactNumber
        }).lean();
        
        vendorActivities.push({
          vendor: user,
          messageCount: messages.length,
          lastActivity: lastActivity,
          firstActivity: firstActivity,
          loanInterest: !!loanReply,
          aadharVerified: user.aadharVerified || false,
          whatsappConsent: user.whatsappConsent || false,
          contactNumber: user.contactNumber,
          name: user.name || 'Unknown',
          location: user.location,
          operatingHours: user.operatingHours,
          status: user.status,
          createdAt: user.createdAt,
          aadharVerificationDate: user.aadharVerificationDate
        });
      } else {
        // Vendor not in database, create basic entry
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        vendorActivities.push({
          vendor: null,
          messageCount: messages.length,
          lastActivity: sortedMessages[sortedMessages.length - 1].timestamp,
          firstActivity: sortedMessages[0].timestamp,
          loanInterest: false,
          aadharVerified: false,
          whatsappConsent: false,
          contactNumber: phoneNumber,
          name: 'Unknown Vendor',
          location: null,
          operatingHours: null,
          status: 'unknown',
          createdAt: null,
          aadharVerificationDate: null
        });
      }
    }
    
    // Sort by message count (most active first)
    vendorActivities.sort((a, b) => b.messageCount - a.messageCount);
    
    // Get top 50
    const top50Vendors = vendorActivities.slice(0, 50);
    
    console.log('\n🏆 TOP 50 MOST ACTIVE VENDORS');
    console.log('==============================');
    
    // Display results
    top50Vendors.forEach((vendor, index) => {
      console.log(`\n${index + 1}. ${vendor.name} (${vendor.contactNumber})`);
      console.log(`   📊 Messages: ${vendor.messageCount}`);
      console.log(`   📅 First Activity: ${new Date(vendor.firstActivity).toLocaleDateString()}`);
      console.log(`   📅 Last Activity: ${new Date(vendor.lastActivity).toLocaleDateString()}`);
      console.log(`   💰 Loan Interest: ${vendor.loanInterest ? '✅ Yes' : '❌ No'}`);
      console.log(`   🆔 Aadhaar Verified: ${vendor.aadharVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`   📱 WhatsApp Consent: ${vendor.whatsappConsent ? '✅ Yes' : '❌ No'}`);
      
      if (vendor.status) {
        console.log(`   📋 Status: ${vendor.status}`);
      }
      
      if (vendor.location) {
        console.log(`   📍 Location: ${vendor.location.coordinates ? `[${vendor.location.coordinates[1]}, ${vendor.location.coordinates[0]}]` : 'Set'}`);
      }
      
      if (vendor.operatingHours) {
        console.log(`   🕒 Operating Hours: ${vendor.operatingHours.openTime || 'Not set'}`);
      }
      
      if (vendor.createdAt) {
        console.log(`   📅 Created: ${new Date(vendor.createdAt).toLocaleDateString()}`);
      }
      
      if (vendor.aadharVerificationDate) {
        console.log(`   🆔 Verified on: ${new Date(vendor.aadharVerificationDate).toLocaleDateString()}`);
      }
    });
    
    // Generate CSV data
    console.log('\n📋 CSV FORMAT (for export):');
    console.log('Name,Contact Number,Messages,First Activity,Last Activity,Loan Interest,Aadhaar Verified,WhatsApp Consent,Status,Location,Operating Hours,Created Date,Aadhaar Verification Date');
    
    top50Vendors.forEach(vendor => {
      const csvLine = [
        `"${vendor.name}"`,
        vendor.contactNumber,
        vendor.messageCount,
        new Date(vendor.firstActivity).toLocaleDateString(),
        new Date(vendor.lastActivity).toLocaleDateString(),
        vendor.loanInterest ? 'Yes' : 'No',
        vendor.aadharVerified ? 'Yes' : 'No',
        vendor.whatsappConsent ? 'Yes' : 'No',
        vendor.status || 'Unknown',
        vendor.location ? 'Set' : 'Not set',
        vendor.operatingHours?.openTime || 'Not set',
        vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'Unknown',
        vendor.aadharVerificationDate ? new Date(vendor.aadharVerificationDate).toLocaleDateString() : 'Not verified'
      ].join(',');
      
      console.log(csvLine);
    });
    
    // Summary statistics
    console.log('\n📊 SUMMARY STATISTICS');
    console.log('=====================');
    console.log(`Total vendors analyzed: ${vendorActivities.length}`);
    console.log(`Top 50 average messages: ${Math.round(top50Vendors.reduce((sum, v) => sum + v.messageCount, 0) / 50)}`);
    console.log(`Vendors with loan interest: ${top50Vendors.filter(v => v.loanInterest).length}`);
    console.log(`Vendors with Aadhaar verified: ${top50Vendors.filter(v => v.aadharVerified).length}`);
    console.log(`Vendors with WhatsApp consent: ${top50Vendors.filter(v => v.whatsappConsent).length}`);
    console.log(`Vendors with location set: ${top50Vendors.filter(v => v.location).length}`);
    console.log(`Vendors with operating hours: ${top50Vendors.filter(v => vendor.operatingHours?.openTime).length}`);
    
    // Most active in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentActiveVendors = top50Vendors.filter(v => 
      new Date(v.lastActivity) > thirtyDaysAgo
    );
    
    console.log(`\n🔥 Recently active (last 30 days): ${recentActiveVendors.length} vendors`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
getMostActiveVendors();
