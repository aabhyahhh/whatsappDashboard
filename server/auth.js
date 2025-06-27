import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { connectDB } from './db.js';
import { Admin } from './models/Admin.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';
import webhookRoutes from './routes/webhook.js';
import contactsRoutes from './routes/contacts.js';
import messagesRoutes from './routes/messages.js';
import verifyRoutes from './routes/verify.js';
import vendorRoutes from './routes/vendor.js';
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Connect to MongoDB
connectDB().catch(console.error);
// Middleware
app.use(cors({
    origin: ['http://localhost:5173','https://whatsappdashboard-1.onrender.com','https://whatsappdashboard.onrender.com','https://admin.laarikhojo.in'],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Use admin routes
app.use('/api/admin', adminRoutes);
//otp verification via whatsapp
app.use('/api/verify', verifyRoutes);
// Use user routes
app.use('/api/users', userRoutes);
// Use webhook routes - no auth required
app.use('/api/webhook', webhookRoutes);
// Use contacts routes
app.use('/api/contacts', contactsRoutes);
// Use messages routes
app.use('/api/messages', messagesRoutes);
// Use vendor routes
app.use('/api/vendor', vendorRoutes);
// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Auth server is running' });
});
// Login endpoint
app.post('/api/auth', (async (req, res) => {
    try {
        const { username, password } = req.body;
        // Find admin by username
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Verify password
        const isValidPassword = await admin.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Update last login
        admin.lastLogin = new Date();
        await admin.save();
        // Generate JWT token
        const token = jwt.sign({
            id: admin._id,
            username: admin.username,
            role: admin.role
        }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Create initial admin user if none exists
async function createInitialAdmin() {
    try {
        const adminExists = await Admin.findOne({ username: 'admin' });
        if (!adminExists) {
            const admin = new Admin({
                username: 'admin',
                password: 'L@@riKh0j0', // This will be hashed by the pre-save hook
                email: 'admin@whatsapp.com',
                role: 'super_admin'
            });
            await admin.save();
            console.log('✅ Initial admin user created');
        }
    }
    catch (error) {
        console.error('Error creating initial admin:', error);
    }
}
// Start server
app.listen(PORT, () => {
    console.log(`Auth server running at http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('- POST /api/auth');
    console.log('- GET /api/health');
    // Create initial admin user
    createInitialAdmin().catch(console.error);
});
