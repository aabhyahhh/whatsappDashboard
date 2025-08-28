import 'dotenv/config';
import mongoose from 'mongoose';

// Single database configuration for both development and production
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';

if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
    console.error('Please create a .env file with your MongoDB connection string:');
    console.error('MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority');
    process.exit(1);
}

// Connection options - optimized for Render starter pack performance
const options: mongoose.ConnectOptions = {
    maxPoolSize: 10, // Reduced for Render starter pack limits
    minPoolSize: 2,  // Reduced minimum connections
    serverSelectionTimeoutMS: process.env.NODE_ENV === 'production' ? 30000 : 5000, // Longer timeout for production
    socketTimeoutMS: process.env.NODE_ENV === 'production' ? 30000 : 15000, // Longer timeout for production
    connectTimeoutMS: process.env.NODE_ENV === 'production' ? 30000 : 5000, // Longer timeout for production
    maxIdleTimeMS: 15000, // Close idle connections faster
    bufferCommands: true, // Enable mongoose buffering for initial operations
    // Production-specific options
    ...(process.env.NODE_ENV === 'production' && {
        ssl: true,
        retryWrites: true,
        w: 'majority',
        readPreference: 'primaryPreferred', // Prefer primary but allow secondary reads
        retryReads: true, // Enable retry reads for better reliability
        maxStalenessSeconds: 90 // Allow slightly stale reads for better performance
    })
};

// Function to connect to MongoDB
export const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, options);
        console.log('✅ MongoDB connected successfully');
        
        // Log the database name
        console.log(`📁 Connected to database: ${mongoose.connection.db?.databaseName || 'unknown'}`);
        
        // Optional: Log all collections in the database
        if (mongoose.connection.db) {
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('📚 Available collections:', collections.map(c => c.name));
        }
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1); // Exit process with failure
    }
};

// Handle connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error during MongoDB disconnection:', err);
        process.exit(1);
    }
}); 