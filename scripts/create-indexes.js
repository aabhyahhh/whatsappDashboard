import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function createIndexes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔧 CREATING DATABASE INDEXES FOR OPTIMIZATION');
    console.log('=============================================');
    
    const db = mongoose.connection.db;
    
    // Index 1: Contact collection - lastSeen index for inactive vendors query
    console.log('\n📊 Creating index on contacts.lastSeen...');
    await db.collection('contacts').createIndex(
      { lastSeen: -1 },
      { 
        name: 'lastSeen_desc',
        background: true 
      }
    );
    console.log('✅ Index created: contacts.lastSeen (-1)');
    
    // Index 2: User collection - contactNumber index for vendor lookup
    console.log('\n📊 Creating index on users.contactNumber...');
    await db.collection('users').createIndex(
      { contactNumber: 1 },
      { 
        name: 'contactNumber_asc',
        background: true 
      }
    );
    console.log('✅ Index created: users.contactNumber (1)');
    
    // Index 3: SupportCallReminderLog collection - composite index for reminder status
    console.log('\n📊 Creating composite index on supportcallreminderlogs...');
    await db.collection('supportcallreminderlogs').createIndex(
      { contactNumber: 1, sentAt: -1 },
      { 
        name: 'contactNumber_sentAt',
        background: true 
      }
    );
    console.log('✅ Index created: supportcallreminderlogs.contactNumber + sentAt');
    
    // Index 4: Message collection - for template message lookups (if needed)
    console.log('\n📊 Creating index on messages.to...');
    await db.collection('messages').createIndex(
      { to: 1, direction: 1, timestamp: -1 },
      { 
        name: 'to_direction_timestamp',
        background: true 
      }
    );
    console.log('✅ Index created: messages.to + direction + timestamp');
    
    // Verify indexes
    console.log('\n📋 VERIFYING INDEXES');
    console.log('====================');
    
    const contactIndexes = await db.collection('contacts').indexes();
    const userIndexes = await db.collection('users').indexes();
    const reminderIndexes = await db.collection('supportcallreminderlogs').indexes();
    const messageIndexes = await db.collection('messages').indexes();
    
    console.log('\n📊 Contact indexes:');
    contactIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n📊 User indexes:');
    userIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n📊 SupportCallReminderLog indexes:');
    reminderIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n📊 Message indexes:');
    messageIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n🎉 All indexes created successfully!');
    console.log('💡 These indexes will dramatically improve query performance.');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createIndexes();
