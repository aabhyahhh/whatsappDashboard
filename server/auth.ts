import 'dotenv/config';
import express from 'express';
import type { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectDB } from './db.js';
import { Admin } from './models/Admin.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';
import webhookRoutes from './routes/webhook.js';
import metaWebhookRoutes from './routes/metaWebhook.js';
import webhookRouterRoutes from './routes/webhookRouter.js';
import conversationRouterRoutes from './routes/conversationRouter.js';
import conversationEngineRoutes from './routes/conversationEngine.js';
import metaHealthRoutes from './routes/metaHealth.js';
import contactsRoutes from './routes/contacts.js';
import messagesRoutes from './routes/messages.js';
import verifyRoutes from './routes/verify.js';
import vendorRoutes from './routes/vendor.js';
import messageHealthRoutes from './routes/messageHealth.js';

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Connect to MongoDB
connectDB().catch(console.error);

// RAW body only on webhook route so HMAC works
app.use('/api/webhook', express.raw({ type: 'application/json' }));

// JSON body parsing for all other routes
app.use(express.json());

// Middleware - Optimized CORS for better performance
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4173', // Vite preview
      'https://whatsappdashboard-1.onrender.com',
      'https://whatsappdashboard.onrender.com',
      'https://admin.laarikhojo.in',
      'https://www.admin.laarikhojo.in'
    ];
    
    // Always allow localhost origins (both development and production)
    if (origin.includes('localhost')) {
      console.log('✅ CORS allowing localhost origin:', origin);
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS allowing origin:', origin);
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 86400 // Cache preflight for 24 hours
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests
app.options('*', cors());

// Add CORS headers to all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Set CORS headers based on origin
  if (origin) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4173',
      'https://whatsappdashboard-1.onrender.com',
      'https://whatsappdashboard.onrender.com',
      'https://admin.laarikhojo.in',
      'https://www.admin.laarikhojo.in'
    ];
    
    // Always allow localhost origins (both development and production)
    if (origin.includes('localhost')) {
      console.log('✅ CORS middleware allowing localhost origin:', origin);
      res.header('Access-Control-Allow-Origin', origin);
    } else if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS middleware allowing origin:', origin);
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      console.log('🚫 CORS blocked origin in middleware:', origin);
    }
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  next();
});

// Request timeout middleware
app.use((req, res, next) => {
  // Set timeout for all requests
  req.setTimeout(10000, () => {
    console.error('Request timeout for:', req.method, req.url);
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Use admin routes
app.use('/api/admin', adminRoutes);

//otp verification via whatsapp
app.use('/api/verify', verifyRoutes);

// Use user routes
app.use('/api/users', userRoutes);

// Use conversation router - no auth required (main entry point for Meta webhooks)
app.use('/api/webhook', conversationRouterRoutes);

// Use conversation engine - no auth required (processes forwarded messages)
app.use('/api/conversation', conversationEngineRoutes);

// Use webhook router - no auth required (legacy webhook router)
app.use('/api/webhook-router', webhookRouterRoutes);

// Use webhook routes - no auth required (legacy Twilio webhooks)
app.use('/api/webhook-legacy', webhookRoutes);

// Use Meta webhook routes - no auth required (direct Meta webhooks)
app.use('/api/meta-webhook', metaWebhookRoutes);

// Use Meta health routes - no auth required
app.use('/api/meta-health', metaHealthRoutes);

// Use contacts routes
app.use('/api/contacts', contactsRoutes);

// Use messages routes
app.use('/api/messages', messagesRoutes);

// Use vendor routes
app.use('/api/vendor', vendorRoutes);

// Use message health routes
app.use('/api/message-health', messageHealthRoutes);

// Environment variables debug endpoint
app.get('/api/debug/env', (req, res) => {
    res.json({
        NODE_ENV: process.env.NODE_ENV,
        META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN ? 'SET' : 'NOT_SET',
        META_PHONE_NUMBER_ID: process.env.META_PHONE_NUMBER_ID || 'NOT_SET',
        META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN || 'NOT_SET',
        META_APP_SECRET: process.env.META_APP_SECRET ? 'SET' : 'NOT_SET',
        RELAY_SECRET: process.env.RELAY_SECRET ? 'SET' : 'NOT_SET',
        MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT_SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET'
    });
});

// Health check endpoint with campaign tracking
app.get('/api/health', async (req, res) => {
    try {
        const healthData: any = { 
            status: 'ok', 
            message: 'Auth server is running',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                twilio: 'available',
                cronJobs: {
                    dailyReminders: 'active',
                    supportReminders: 'active'
                }
            }
        };


        
        res.json(healthData);
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Scheduler health check endpoint
app.get('/api/scheduler/health', async (req, res) => {
    try {
        const { getSchedulerHealth } = await import('./scheduler/metaSchedulerFixed.ts');
        const health = getSchedulerHealth();
        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Optimized dashboard stats endpoint - single request for all stats
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Import models dynamically
        const { User } = await import('./models/User.js');
        const { Message } = await import('./models/Message.js');
        
        // Run all queries in parallel for better performance
        const [totalVendors, totalIncomingMessages, totalOpenVendors, activeVendors24h] = await Promise.all([
            User.countDocuments(),
            Message.countDocuments({ direction: 'inbound' }),
            User.countDocuments({ status: 'open' }),
            Message.distinct('from', {
                direction: 'inbound',
                timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }).then(users => users.length)
        ]);
        
        const totalTime = Date.now() - startTime;
        console.log(`📊 Dashboard stats fetched in ${totalTime}ms`);
        
        res.json({
            totalVendors,
            totalIncomingMessages,
            totalOpenVendors,
            activeVendors24h
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

interface LoginRequest {
    username: string;
    password: string;
}

// Login endpoint - Optimized for performance
app.post('/api/auth', (async (req: Request<{}, {}, LoginRequest>, res: Response) => {
    const startTime = Date.now();
    
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            console.log(`❌ Login failed: Missing credentials (${Date.now() - startTime}ms)`);
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find admin by username with projection and timeout
        const admin = await Admin.findOne(
            { username }, 
            'username password role _id lastLogin'
        )
        .lean()
        .maxTimeMS(3000); // Reduced timeout to 3 seconds

        if (!admin) {
            console.log(`❌ Login failed: User '${username}' not found (${Date.now() - startTime}ms)`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password with shorter timeout
        const isValidPassword = await Promise.race([
            bcrypt.compare(password, admin.password),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Password verification timeout')), 2000)
            )
        ]);

        if (!isValidPassword) {
            console.log(`❌ Login failed: Invalid password for user '${username}' (${Date.now() - startTime}ms)`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: admin._id,
                username: admin.username,
                role: admin.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login asynchronously (don't wait for it)
        Admin.findByIdAndUpdate(
            admin._id, 
            { lastLogin: new Date() },
            { new: false }
        ).catch(err => console.error('Failed to update last login:', err));

        const totalTime = Date.now() - startTime;
        console.log(`✅ Login successful for '${username}' (${totalTime}ms)`);

        res.json({ token });
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ Login error after ${totalTime}ms:`, error);
        
        if (error.message === 'Password verification timeout') {
            res.status(408).json({ error: 'Login timeout - please try again' });
        } else if (error.name === 'MongooseError' && error.message.includes('timeout')) {
            res.status(408).json({ error: 'Database timeout - please try again' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}) as RequestHandler);

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
    } catch (error) {
        console.error('Error creating initial admin:', error);
    }
}

// Background jobs are now handled by a separate worker service
// The scheduler runs independently via npm run start:scheduler

// Start server
app.listen(PORT, () => {
    console.log(`Auth server running at http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('- POST /api/auth');
    console.log('- GET /api/health');
    
    // Create initial admin user
    createInitialAdmin().catch(console.error);
}); 