import mongoose from 'mongoose';

// Environment-based database configuration
const getMongoURI = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
        // Production: Use MONGODB_URI (restricted access)
        const productionURI = process.env.MONGODB_URI;
        if (!productionURI) {
            console.error('❌ MONGODB_URI is required for production environment');
            process.exit(1);
        }
        console.log('🔒 Using production database (restricted access)');
        return productionURI;
    } else {
        // Development: Use MONGODB_URI_DEV (0.0.0.0 access for development)
        const devURI = process.env.MONGODB_URI_DEV || process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_dev';
        console.log('🛠️ Using development database (0.0.0.0 access)');
        return devURI;
    }
};

const MONGO_URI = getMongoURI();

// Connection options - simplified for development
const options: mongoose.ConnectOptions = {
    // Basic options
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
};

// Function to connect to MongoDB
export const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, options);
        console.log('✅ MongoDB connected successfully');
        
        const db = mongoose.connection.db;
        if (!db) throw new Error('Database connection not established');
        
        // Log the database name
        console.log(`📁 Connected to database: ${db.databaseName}`);
        
        // Optional: Log all collections in the database
        const collections = await db.listCollections().toArray();
        console.log('📚 Available collections:', collections.map(c => c.name));
        
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