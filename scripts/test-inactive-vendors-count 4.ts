import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI;

async function testInactiveVendorsCount() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧪 TESTING INACTIVE VENDORS COUNT');
    console.log('=================================');
    
    // Calculate date 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    console.log(`📅 3 days ago: ${threeDaysAgo.toLocaleString()}`);
    
    // Count total inactive users
    const totalInactive = await User.countDocuments({
      updatedAt: { $lt: threeDaysAgo }
    });
    
    console.log(`📊 Total inactive vendors (3+ days): ${totalInactive}`);
    
    // Get a sample of inactive users
    const sampleInactive = await User.find({
      updatedAt: { $lt: threeDaysAgo }
    })
    .select('name contactNumber updatedAt')
    .sort({ updatedAt: -1 })
    .limit(10);
    
    console.log(`\n📋 Sample inactive vendors (first 10):`);
    console.log('=====================================');
    sampleInactive.forEach((user, i) => {
      const daysInactive = Math.floor((Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`${i + 1}. ${user.name || 'Unknown'} (${user.contactNumber})`);
      console.log(`   Last updated: ${user.updatedAt.toLocaleString()}`);
      console.log(`   Days inactive: ${daysInactive}`);
      console.log('');
    });
    
    // Test pagination
    const page = 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    
    const paginatedInactive = await User.find({
      updatedAt: { $lt: threeDaysAgo }
    })
    .select('name contactNumber updatedAt')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);
    
    const totalPages = Math.ceil(totalInactive / limit);
    
    console.log(`📄 Pagination test:`);
    console.log(`   Page: ${page}`);
    console.log(`   Limit: ${limit}`);
    console.log(`   Total: ${totalInactive}`);
    console.log(`   Total pages: ${totalPages}`);
    console.log(`   Vendors on page ${page}: ${paginatedInactive.length}`);
    
    // Simulate API response
    const apiResponse = {
      vendors: paginatedInactive.map(user => ({
        _id: user._id,
        name: user.name,
        contactNumber: user.contactNumber,
        updatedAt: user.updatedAt,
        lastInteractionDate: user.updatedAt,
        daysInactive: Math.floor((Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
      })),
      pagination: {
        page,
        limit,
        total: totalInactive,
        pages: totalPages
      }
    };
    
    console.log(`\n🔍 API Response Structure:`);
    console.log(`   Vendors count: ${apiResponse.vendors.length}`);
    console.log(`   Pagination total: ${apiResponse.pagination.total}`);
    console.log(`   Pagination pages: ${apiResponse.pagination.pages}`);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the test
testInactiveVendorsCount().catch(console.error);
