import mongoose from 'mongoose';

// Single database configuration for both development and production
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';

if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
    console.error('Please create a .env file with your MongoDB connection string:');
    console.error('MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority');
    process.exit(1);
}

// Connection options - optimized for performance
const options: mongoose.ConnectOptions = {
    maxPoolSize: 20, // Increased pool size for better concurrency
    minPoolSize: 5,  // Maintain minimum connections
    serverSelectionTimeoutMS: 10000, // Reduced for faster failure detection
    socketTimeoutMS: 30000, // Reduced for faster timeouts
    connectTimeoutMS: 10000, // Reduced for faster connection
    maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
    // Production-specific options
    ...(process.env.NODE_ENV === 'production' && {
        ssl: true,
        retryWrites: true,
        w: 'majority'
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