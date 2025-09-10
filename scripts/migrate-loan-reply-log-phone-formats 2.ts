import 'dotenv/config';
import mongoose from 'mongoose';
import { toE164 } from '../server/utils/phone.js';

async function migrateLoanReplyLogPhoneFormats() {
  try {
    console.log('🔄 Starting LoanReplyLog phone format migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('✅ Connected to MongoDB');
    
    // Import the LoanReplyLog model
    const LoanReplyLogModel = (await import('../server/models/LoanReplyLog.js')).default;
    
    // Find all LoanReplyLog entries
    const allLogs = await LoanReplyLogModel.find({});
    console.log(`📊 Found ${allLogs.length} LoanReplyLog entries`);
    
    let updatedCount = 0;
    let duplicateCount = 0;
    
    for (const log of allLogs) {
      const originalContactNumber = log.contactNumber;
      const normalizedContactNumber = toE164(originalContactNumber);
      
      // Skip if already in correct format
      if (originalContactNumber === normalizedContactNumber) {
        continue;
      }
      
      console.log(`🔍 Processing: ${originalContactNumber} -> ${normalizedContactNumber}`);
      
      // Check if a log with the normalized number already exists
      const existingLog = await LoanReplyLogModel.findOne({
        contactNumber: normalizedContactNumber,
        _id: { $ne: log._id }
      });
      
      if (existingLog) {
        console.log(`⚠️ Duplicate found for ${normalizedContactNumber}, merging data...`);
        
        // Merge the data (keep the most recent timestamp and highest verification status)
        const mergedData = {
          contactNumber: normalizedContactNumber,
          vendorName: existingLog.vendorName || log.vendorName,
          timestamp: new Date(Math.max(
            new Date(existingLog.timestamp).getTime(),
            new Date(log.timestamp).getTime()
          )),
          aadharVerified: existingLog.aadharVerified || log.aadharVerified
        };
        
        // Update the existing log
        await LoanReplyLogModel.findByIdAndUpdate(existingLog._id, mergedData);
        
        // Delete the duplicate log
        await LoanReplyLogModel.findByIdAndDelete(log._id);
        
        duplicateCount++;
        console.log(`✅ Merged and deleted duplicate for ${normalizedContactNumber}`);
      } else {
        // Update the contact number to E.164 format
        await LoanReplyLogModel.findByIdAndUpdate(log._id, {
          contactNumber: normalizedContactNumber
        });
        
        updatedCount++;
        console.log(`✅ Updated ${originalContactNumber} -> ${normalizedContactNumber}`);
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Updated entries: ${updatedCount}`);
    console.log(`🔄 Merged duplicates: ${duplicateCount}`);
    console.log(`📋 Total processed: ${updatedCount + duplicateCount}`);
    
    // Create unique index on contactNumber to prevent future duplicates
    try {
      await LoanReplyLogModel.collection.createIndex(
        { contactNumber: 1 },
        { unique: true, sparse: true }
      );
      console.log('✅ Created unique index on contactNumber');
    } catch (indexError) {
      console.log('⚠️ Index creation failed (may already exist):', indexError.message);
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateLoanReplyLogPhoneFormats();
