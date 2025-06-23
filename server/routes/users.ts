import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import schedule from 'node-schedule';
import { client } from '../twilio.js';
import multer from 'multer';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Ensure this matches auth.ts
const upload = multer({ dest: 'uploads/' });

// Extend Request to include user property
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; username: string; role: string };
        }
    }
}

// Middleware to verify JWT
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        res.sendStatus(401); // No token
        return;
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            res.sendStatus(403); // Invalid token
            return;
        }
        req.user = user as { id: string; username: string; role: string };
        next();
    });
};

// GET all regular users
router.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST create a new regular user
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const {
            contactNumber, name, status, openTime, closeTime, operatingHours, foodType, bestDishes, menuLink, mapsLink,
            profilePictures, preferredLanguages, foodCategories, stallType, whatsappConsent, onboardingType, aadharNumber, aadharFrontUrl, aadharBackUrl, panNumber
        } = req.body;

        // Basic validation
        if (!contactNumber || !name) {
            res.status(400).json({ message: 'Contact number and name are required' });
            return;
        }

        // Validate bestDishes (at least 1 required)
        if (!bestDishes || bestDishes.length < 1 || !bestDishes[0].name || !bestDishes[0].name.trim()) {
            res.status(400).json({ message: 'At least one best dish is required and must have a name' });
            return;
        }

        // Filter out bestDishes without a name before saving
        const filteredBestDishes = bestDishes ? bestDishes.filter((dish: any) => dish.name && dish.name.trim()) : [];

        // Check if contact number already exists
        const existingUser = await User.findOne({ contactNumber });
        if (existingUser) {
            res.status(409).json({ message: 'User with that contact number already exists' });
            return;
        }

        const newUser = new User({
            contactNumber, name, status, openTime, closeTime, operatingHours, foodType, bestDishes: filteredBestDishes, menuLink, mapsLink,
            profilePictures, preferredLanguages, foodCategories, stallType, whatsappConsent, onboardingType, aadharNumber, aadharFrontUrl, aadharBackUrl, panNumber
        });
        await newUser.save();

        // Send WhatsApp message to the new user
        try {
            if (client) {
                const msgPayload: any = {
                    from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                    to: `whatsapp:${contactNumber}`,
                    contentSid: 'HX6a0f4a444898f786438781e8e2058a46',
                    contentVariables: JSON.stringify({})
                };
                if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                    msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                }
                const twilioResp = await client.messages.create(msgPayload);
                console.log('✅ Sent welcome template message HX6a0f4a444898f786438781e8e2058a46 to new user. Twilio response:', twilioResp);
            }
        } catch (err: any) {
            console.error('Failed to send WhatsApp message to new user:', err?.message || err, err);
        }

        // Schedule WhatsApp message to vendor half hour before openTime
        try {
            if (client && openTime) {
                // Parse openTime (e.g., '11:00') and schedule for half hour before
                const [openHour, openMinute] = openTime.split(':').map(Number);
                const now = new Date();
                let scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), openHour, openMinute);
                scheduledTime.setMinutes(scheduledTime.getMinutes() - 30);
                if (scheduledTime < now) {
                    // If the time is in the past, schedule for next day
                    scheduledTime.setDate(scheduledTime.getDate() + 1);
                }
                schedule.scheduleJob(scheduledTime, async function () {
                    // Extract coordinates from mapsLink or WhatsApp location
                    let lat = null, lng = null;
                    if (mapsLink) {
                        // Try to extract from Google Maps link
                        const atMatch = mapsLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                        if (atMatch) {
                            lat = atMatch[1];
                            lng = atMatch[2];
                        } else {
                            const qMatch = mapsLink.match(/[?&]q=([-?\d.]+),([-?\d.]+)/);
                            if (qMatch) {
                                lat = qMatch[1];
                                lng = qMatch[2];
                            }
                        }
                    }
                    // If not found, expect WhatsApp location to be sent by vendor in reply
                    if (client) {
                        await client.messages.create({
                            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                            to: `whatsapp:${contactNumber}`,
                            contentSid: 'HXca82cc02b7d0270c00e675d0ba7f341a',
                            contentVariables: JSON.stringify({ lat, lng })
                        });
                    }
                });
            }
        } catch (err) {
            console.error('Failed to schedule WhatsApp message to vendor:', err);
        }

        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT update a user by ID
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            contactNumber, name, status, openTime, closeTime, operatingHours, foodType, bestDishes, menuLink, mapsLink,
            profilePictures, preferredLanguages, foodCategories, stallType, whatsappConsent, onboardingType, aadharNumber, aadharFrontUrl, aadharBackUrl, panNumber
        } = req.body;

        const user = await User.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Basic validation for updates
        if (bestDishes) {
            if (bestDishes.length < 1 || !bestDishes[0].name || !bestDishes[0].name.trim()) {
                res.status(400).json({ message: 'At least one best dish is required and must have a name' });
                return;
            }
        }

        // Filter out bestDishes without a name before saving
        const filteredBestDishes = bestDishes ? bestDishes.filter((dish: any) => dish.name && dish.name.trim()) : user.bestDishes;

        if (contactNumber) user.contactNumber = contactNumber;
        if (name) user.name = name;
        if (status) user.status = status;
        if (openTime) user.openTime = openTime;
        if (closeTime) user.closeTime = closeTime;
        if (operatingHours) user.operatingHours = operatingHours;
        if (foodType) user.foodType = foodType;
        user.bestDishes = filteredBestDishes;
        if (menuLink) user.menuLink = menuLink;
        if (mapsLink) user.mapsLink = mapsLink;
        if (profilePictures) user.profilePictures = profilePictures;
        if (preferredLanguages) user.preferredLanguages = preferredLanguages;
        if (foodCategories) user.foodCategories = foodCategories;
        if (stallType) user.stallType = stallType;
        if (typeof whatsappConsent === 'boolean') user.whatsappConsent = whatsappConsent;
        if (onboardingType) user.onboardingType = onboardingType;
        if (aadharNumber) user.aadharNumber = aadharNumber;
        if (aadharFrontUrl) user.aadharFrontUrl = aadharFrontUrl;
        if (aadharBackUrl) user.aadharBackUrl = aadharBackUrl;
        if (panNumber) user.panNumber = panNumber;
        user.updatedAt = new Date();

        await user.save();
        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE a user by ID
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await User.findByIdAndDelete(id);
        if (!result) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET all user contact numbers and names (public, for contacts list)
router.get('/user-contacts', async (req: Request, res: Response) => {
    try {
        const users = await User.find({}, { contactNumber: 1, name: 1, _id: 0 });
        res.json(users);
    } catch (error) {
        console.error('Error fetching user contacts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Image upload endpoint
router.post('/upload-images', authenticateToken, upload.array('images', 10), async (req, res) => {
    const files = req.files as Express.Multer.File[];
    const urls = files.map(file => `/uploads/${file.filename}`);
    res.json({ urls });
});

export default router; 