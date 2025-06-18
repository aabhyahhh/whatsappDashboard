import mongoose from 'mongoose';

// TODO: Replace this with your actual MongoDB Atlas connection string
// You can get this from MongoDB Atlas dashboard:
// 1. Click "Connect" on your cluster
// 2. Choose "Connect your application"
// 3. Copy the connection string and replace <username>, <password>, <cluster>, and <database>
// Example: mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/whatsapp?retryWrites=true&w=majority
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
    console.error('Please create a .env file with your MongoDB connection string:');
    console.error('MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority');
    process.exit(1);
}

// Connection options - removed deprecated options
const options = {} as mongoose.ConnectOptions;

// Function to connect to MongoDB
export const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, options);
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