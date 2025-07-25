import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { client } from '../twilio.js';
import multer from 'multer';
import schedule from 'node-schedule';

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

// Helper: Convert day names to numbers
const dayNameToNumber: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};
// Improved normalizeDays function to handle various input formats
function normalizeDays(days: any): number[] {
  if (!days) return [];

  let dayNames: string[] = [];

  try {
    // Handle different input formats
    if (typeof days === 'string') {
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(days);
        if (Array.isArray(parsed)) {
          dayNames = parsed.filter(day => typeof day === 'string');
        } else {
          // If it's a string but not valid JSON, extract day names with regex
          const matches = days.match(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/g);
          dayNames = matches || [];
        }
      } catch {
        // If JSON parsing fails, use regex to extract day names
        const matches = days.match(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/g);
        dayNames = matches || [];
      }
    } else if (Array.isArray(days)) {
      // If it's already an array, filter for strings
      dayNames = days.filter(day => typeof day === 'string');
    } else {
      console.warn('Unexpected days format:', days);
      return [];
    }

    // Convert day names to numbers
    return dayNames
      .map(dayName => dayNameToNumber[dayName as keyof typeof dayNameToNumber])
      .filter((dayNum): dayNum is number => typeof dayNum === 'number');
      
  } catch (error) {
    console.error('Error normalizing days:', error);
    return [];
  }
}

function isValidTimeFormat(time: string): boolean {
    // Matches 'h:mm AM/PM' (12-hour) or 'HH:mm' (24-hour)
    return /^([1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(time) || /^([01]?\d|2[0-3]):[0-5][0-9]$/.test(time);
}

// GET all regular users
router.get('/', authenticateToken, async (_req: Request, res: Response) => {
    try {
        const users = await User.find();
        const usersWithStatus = users.map(user => {
            const obj = user.toObject();
            // @ts-ignore
            obj.isOpenNow = typeof (user as any).isOpenNow === 'function' ? (user as any).isOpenNow() : false;
            return obj;
        });
        res.json(usersWithStatus);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST create a new regular user
router.post('/', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
    if (!['admin', 'super_admin', 'onground'].includes(req.user?.role || '')) {
        return res.status(403).json({ message: 'Access denied: Requires admin, super_admin, or onground role' });
    }
    next();
}, async (req: Request, res: Response) => {
    try {
        // Destructure all expected fields from req.body
        const {
            contactNumber, name, status, mapsLink, operatingHours, foodType, bestDishes, menuLink,
            profilePictures, preferredLanguages, foodCategories, stallType, whatsappConsent,
            onboardingType, aadharNumber, aadharFrontUrl, aadharBackUrl, panNumber, latitude, longitude
        } = req.body;

        // Basic validation
        if (!contactNumber || !name) {
            res.status(400).json({ message: 'Contact number and name are required' });
            return;
        }
        if (!operatingHours || !operatingHours.openTime || !operatingHours.closeTime || !operatingHours.days) {
            res.status(400).json({ message: 'Operating hours are required' });
            return;
        }
        if (!bestDishes || bestDishes.length < 1 || !bestDishes[0].name || !bestDishes[0].name.trim()) {
            res.status(400).json({ message: 'At least one best dish is required and must have a name' });
            return;
        }
        if (!isValidTimeFormat(operatingHours.openTime) || !isValidTimeFormat(operatingHours.closeTime)) {
            res.status(400).json({ message: 'Invalid time format. Use h:mm AM/PM or HH:mm.' });
            return;
        }

        // Normalize operating hours days
        if (operatingHours && operatingHours.days) {
            operatingHours.days = normalizeDays(operatingHours.days);
            // Deduplicate days
            operatingHours.days = Array.from(new Set(operatingHours.days.filter((d: number) => typeof d === 'number' && d >= 0 && d <= 6)));
        }

        // Create location object from coordinates if provided
        let location = undefined;
        if (latitude && longitude) {
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                location = {
                    type: 'Point',
                    coordinates: [lng, lat] // MongoDB expects [longitude, latitude]
                };
            }
        }

        // Create and save the user with all fields
        const newUser = new User({
            contactNumber, name, status, operatingHours, foodType, menuLink,
            profilePictures, preferredLanguages, foodCategories, stallType, whatsappConsent,
            onboardingType, aadharNumber, aadharFrontUrl, aadharBackUrl, panNumber
        });
        if (bestDishes) newUser.bestDishes = bestDishes.filter((dish: any) => dish.name && dish.name.trim());
        if (typeof mapsLink === 'string') newUser.mapsLink = mapsLink;
        if (location) newUser.location = location;
        await newUser.save();

        // Send WhatsApp message to the new user based on preferred language
        try {
            if (client) {
                // Always use the common message SID for all vendors
                const contentSid = 'HXc2e10711c3a3cbb31203854bccc39d2d';
                console.log(`Attempting to send welcome message with template SID: ${contentSid} to vendor: ${contactNumber}`);
                const msgPayload: any = {
                    from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                    to: `whatsapp:${contactNumber}`,
                    contentSid,
                    contentVariables: JSON.stringify({})
                };
                if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                    msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                }
                try {
                    const twilioResp = await client.messages.create(msgPayload);
                    console.log(`✅ Sent welcome template message ${contentSid} to new user. Twilio response:`, twilioResp);
                } catch (err: any) {
                    if (err.code === 63038) {
                        console.error('Twilio daily message limit reached. Skipping WhatsApp send.');
                    } else {
                        console.error('Failed to send WhatsApp message to new user:', err?.message || err, err);
                    }
                }
            }
        } catch (err: any) {
            console.error('Unexpected error in WhatsApp message send:', err?.message || err, err);
        }

        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT update a user by ID - FIXED VERSION
router.put('/:id', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
    if (!['admin', 'super_admin', 'onground'].includes(req.user?.role || '')) {
        return res.status(403).json({ message: 'Access denied: Requires admin, super_admin, or onground role' });
    }
    next();
}, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            contactNumber, name, status, openTime, closeTime, operatingHours, foodType, bestDishes, menuLink, mapsLink,
            profilePictures, preferredLanguages, foodCategories, stallType, whatsappConsent, onboardingType, aadharNumber, aadharFrontUrl, aadharBackUrl, panNumber, latitude, longitude
        } = req.body;

        // Basic validation for updates
        if (bestDishes) {
            if (bestDishes.length < 1 || !bestDishes[0].name || !bestDishes[0].name.trim()) {
                res.status(400).json({ message: 'At least one best dish is required and must have a name' });
                return;
            }
        }

        // Filter out bestDishes without a name before saving
        const filteredBestDishes = bestDishes ? bestDishes.filter((dish: any) => dish.name && dish.name.trim()) : undefined;

        // Prepare the update object
        const updateFields: any = {};

        if (contactNumber) updateFields.contactNumber = contactNumber;
        if (name) updateFields.name = name;
        if (status) updateFields.status = status;
        if (foodType) updateFields.foodType = foodType;
        if (filteredBestDishes) updateFields.bestDishes = filteredBestDishes;
        if (menuLink) updateFields.menuLink = menuLink;
        if (typeof mapsLink === 'string') updateFields.mapsLink = mapsLink;
        if (profilePictures) updateFields.profilePictures = profilePictures;
        if (preferredLanguages) updateFields.preferredLanguages = preferredLanguages;
        if (foodCategories) updateFields.foodCategories = foodCategories;
        if (stallType) updateFields.stallType = stallType;
        if (typeof whatsappConsent === 'boolean') updateFields.whatsappConsent = whatsappConsent;
        if (onboardingType) updateFields.onboardingType = onboardingType;
        if (aadharNumber) updateFields.aadharNumber = aadharNumber;
        if (aadharFrontUrl) updateFields.aadharFrontUrl = aadharFrontUrl;
        if (aadharBackUrl) updateFields.aadharBackUrl = aadharBackUrl;
        if (panNumber) updateFields.panNumber = panNumber;

        // Handle operating hours with special care
        const existingUser = await User.findById(id);
        if (!existingUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Initialize operating hours if it doesn't exist
        let currentOperatingHours = existingUser.operatingHours || { openTime: '', closeTime: '', days: [] };

        // Update operating hours fields
        if (operatingHours) {
            if (operatingHours.openTime) currentOperatingHours.openTime = operatingHours.openTime;
            if (operatingHours.closeTime) currentOperatingHours.closeTime = operatingHours.closeTime;
            if (operatingHours.days !== undefined) {
                console.log('Original operatingHours.days:', operatingHours.days);
                console.log('Type of operatingHours.days:', typeof operatingHours.days);
                
                const normalizedDays = normalizeDays(operatingHours.days);
                console.log('Normalized days:', normalizedDays);
                
                // Deduplicate days
                currentOperatingHours.days = Array.from(new Set(normalizedDays.filter((d: number) => typeof d === 'number' && d >= 0 && d <= 6)));
            }
        }

        // Handle legacy fields
        if (openTime) currentOperatingHours.openTime = openTime;
        if (closeTime) currentOperatingHours.closeTime = closeTime;

        // Set the complete operating hours object
        updateFields.operatingHours = currentOperatingHours;
        updateFields.updatedAt = new Date();

        // Handle location coordinates if provided
        if (latitude && longitude) {
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                updateFields.location = {
                    type: 'Point',
                    coordinates: [lng, lat] // MongoDB expects [longitude, latitude]
                };
            }
        }

        // Use findByIdAndUpdate with { new: true, runValidators: true }
        // This bypasses the existing document validation issues
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { 
                new: true, 
                runValidators: true,
                context: 'query' // This helps with validation context
            }
        );

        if (!updatedUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (operatingHours && (operatingHours.openTime || operatingHours.closeTime)) {
            if (operatingHours.openTime && !isValidTimeFormat(operatingHours.openTime)) {
                res.status(400).json({ message: 'Invalid openTime format. Use h:mm AM/PM or HH:mm.' });
                return;
            }
            if (operatingHours.closeTime && !isValidTimeFormat(operatingHours.closeTime)) {
                res.status(400).json({ message: 'Invalid closeTime format. Use h:mm AM/PM or HH:mm.' });
                return;
            }
        }

        res.json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE a user by ID
router.delete('/:id', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
    if (!['admin', 'super_admin'].includes(req.user?.role || '')) {
        return res.status(403).json({ message: 'Access denied: Requires admin or super_admin role' });
    }
    next();
}, async (req: Request, res: Response) => {
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

// ADD THIS: Database cleanup script (run this once to fix existing data)
router.post('/cleanup-operating-hours', authenticateToken, async (_req: Request, res: Response) => {
    try {
        console.log('Starting database cleanup for operatingHours...');
        
        const users = await User.find({});
        let fixedCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                let needsUpdate = false;
                let cleanOperatingHours = user.operatingHours || { openTime: '', closeTime: '', days: [] };

                // Check if days field needs cleaning
                if (user.operatingHours && user.operatingHours.days) {
                    const currentDays = user.operatingHours.days;
                    
                    // Check if any element is not a number between 0-6
                    const hasInvalidData = currentDays.some((day: any) => 
                        typeof day !== 'number' || day < 0 || day > 6
                    );

                    if (hasInvalidData) {
                        console.log(`Fixing user ${user._id}: ${user.name}`);
                        console.log('Current days:', currentDays);
                        
                        const normalizedDays = normalizeDays(currentDays);
                        console.log('Normalized to:', normalizedDays);
                        
                        cleanOperatingHours.days = normalizedDays;
                        needsUpdate = true;
                    }
                }

                if (needsUpdate) {
                    await User.findByIdAndUpdate(
                        user._id,
                        { 
                            $set: { 
                                operatingHours: cleanOperatingHours,
                                updatedAt: new Date()
                            }
                        },
                        { runValidators: true }
                    );
                    fixedCount++;
                }
            } catch (userError) {
                console.error(`Error fixing user ${user._id}:`, userError);
                errorCount++;
            }
        }

        console.log(`Cleanup completed. Fixed: ${fixedCount}, Errors: ${errorCount}`);
        res.json({ 
            message: 'Database cleanup completed', 
            fixed: fixedCount, 
            errors: errorCount 
        });
    } catch (error) {
        console.error('Error during database cleanup:', error);
        res.status(500).json({ message: 'Cleanup failed' });
    }
});

// GET all user contact numbers and names (public, for contacts list)
router.get('/user-contacts', async (_req: Request, res: Response) => {
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

// Add this endpoint to apply vendor indexing to all existing users
router.post('/apply-indexing', authenticateToken, async (_req, res) => {
  try {
    const users = await User.find({});
    let updatedCount = 0;
    const entryTypeMap: Record<string, 'O' | 'M' | 'W'> = {
      'on ground': 'O',
      'manual entry': 'M',
      'via website': 'W',
      'O': 'O',
      'M': 'M',
      'W': 'W',
    };
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      // Determine primaryLanguage
      let primaryLanguage = Array.isArray(user.preferredLanguages) && user.preferredLanguages.length > 0
        ? user.preferredLanguages[0]
        : 'English';
      // Determine entryType
      let entryType: 'O' | 'M' | 'W' = 'M';
      if (user.onboardingType && entryTypeMap[user.onboardingType]) {
        entryType = entryTypeMap[user.onboardingType];
      }
      // Determine addedBy
      let addedBy = (user as any).addedBy || 'System';
      // Generate vendorIndex
      const languageCode = primaryLanguage.substring(0, 2).toUpperCase();
      const vendorIndex = `${i + 1}*${languageCode}*${entryType}*${addedBy}`;
      // Update user
      try {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            primaryLanguage,
            entryType,
            addedBy,
            vendorIndex
          }
        });
        console.log(`Updated user ${user._id} with vendorIndex: ${vendorIndex}`);
      } catch (err) {
        console.error(`Failed to update user ${user._id}:`, err);
      }
      updatedCount++;
    }
    res.json({ message: `Indexing applied to ${updatedCount} users.` });
  } catch (error) {
    console.error('Error applying vendor indexing:', error);
    res.status(500).json({ message: 'Failed to apply vendor indexing.' });
  }
});

// Schedule for sending opening reminders
schedule.scheduleJob('*/10 * * * *', async () => {
    // ... existing code ...
});

export default router; 