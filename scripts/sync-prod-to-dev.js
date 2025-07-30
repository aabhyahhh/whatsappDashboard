import { MongoClient } from 'mongodb';
import 'dotenv/config';

// Connection strings
const PROD_URI = process.env.MONGODB_URI; // Production cluster (ac-iwq0k9m)
const DEV_URI = process.env.MONGODB_URI_DEV; // Development cluster (ac-wvrpy1t)

const PROD_DB = 'test'; // Production database name
const DEV_DB = 'whatsapp_dev'; // Development database name

async function syncDatabase() {
    const prodClient = new MongoClient(PROD_URI);
    const devClient = new MongoClient(DEV_URI);

    try {
        console.log('🔄 Starting database sync from production to development...');
        
        // Connect to both databases
        await prodClient.connect();
        await devClient.connect();
        
        console.log('✅ Connected to both databases');
        
        const prodDb = prodClient.db(PROD_DB);
        const devDb = devClient.db(DEV_DB);
        
        // Get all collections from production
        const collections = await prodDb.listCollections().toArray();
        console.log(`📚 Found ${collections.length} collections in production`);
        
        for (const collection of collections) {
            const collectionName = collection.name;
            console.log(`\n🔄 Syncing collection: ${collectionName}`);
            
            // Get all documents from production collection
            const documents = await prodDb.collection(collectionName).find({}).toArray();
            console.log(`   📄 Found ${documents.length} documents`);
            
            if (documents.length > 0) {
                // Clear existing data in development collection
                await devDb.collection(collectionName).deleteMany({});
                console.log(`   🗑️  Cleared existing data in development`);
                
                // Insert documents into development collection
                await devDb.collection(collectionName).insertMany(documents);
                console.log(`   ✅ Inserted ${documents.length} documents into development`);
            } else {
                console.log(`   ⚠️  No documents to sync`);
            }
        }
        
        console.log('\n🎉 Database sync completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during sync:', error);
    } finally {
        await prodClient.close();
        await devClient.close();
        console.log('🔌 Disconnected from databases');
    }
}

// Run the sync
syncDatabase(); 