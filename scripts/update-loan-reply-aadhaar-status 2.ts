import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Import models
import User from '../server/models/User.js';
import LoanReplyLog from '../server/models/LoanReplyLog.js';

async function updateLoanReplyAadhaarStatus() {
  try {
    console.log('🔄 Updating LoanReplyLog Aadhaar verification status...');
    console.log('==================================================');
    
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get all LoanReplyLog entries
    const loanReplies = await LoanReplyLog.find({}).sort({ timestamp: -1 });
    console.log(`📊 Found ${loanReplies.length} LoanReplyLog entries`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const loanReply of loanReplies) {
      try {
        // Find the corresponding user
        const user = await User.findOne({ contactNumber: loanReply.contactNumber });
        
        if (user) {
          // Check if user has Aadhaar verification status
          const shouldBeVerified = user.aadharVerified === true;
          const currentStatus = loanReply.aadharVerified === true;
          
          if (shouldBeVerified !== currentStatus) {
            // Update the LoanReplyLog entry
            await LoanReplyLog.findByIdAndUpdate(
              loanReply._id,
              { aadharVerified: shouldBeVerified },
              { new: true }
            );
            
            console.log(`✅ Updated ${user.name} (${loanReply.contactNumber}): ${currentStatus} → ${shouldBeVerified}`);
            updatedCount++;
          } else {
            console.log(`ℹ️ No update needed for ${user.name} (${loanReply.contactNumber}): ${currentStatus}`);
          }
        } else {
          console.log(`⚠️ No user found for contact number: ${loanReply.contactNumber}`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${loanReply.contactNumber}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Updated: ${updatedCount} entries`);
    console.log(`❌ Errors: ${errorCount} entries`);
    console.log(`📋 Total processed: ${loanReplies.length} entries`);
    
    // Show current status
    console.log('\n📋 Current LoanReplyLog status:');
    const verifiedCount = await LoanReplyLog.countDocuments({ aadharVerified: true });
    const unverifiedCount = await LoanReplyLog.countDocuments({ aadharVerified: false });
    console.log(`✅ Verified: ${verifiedCount} entries`);
    console.log(`❌ Unverified: ${unverifiedCount} entries`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
updateLoanReplyAadhaarStatus();
