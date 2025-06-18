import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { Admin } from '../models/Admin'; // Import Admin model for JWT_SECRET consistency

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Ensure this matches auth.ts

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
        const { contactNumber, name, status, profilePictureUrl, openTime, closeTime, operatingHours, foodType, bestDishes, menuLink, mapsLink } = req.body;

        // Basic validation
        if (!contactNumber || !name) {
            res.status(400).json({ message: 'Contact number and name are required' });
            return;
        }

        // Validate bestDishes (first 3 compulsory)
        if (!bestDishes || bestDishes.length < 3 || bestDishes.slice(0, 3).some((dish: any) => !dish.name || !dish.name.trim())) {
            res.status(400).json({ message: 'At least first 3 best dishes are required and must have a name' });
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

        const newUser = new User({ contactNumber, name, status, profilePictureUrl, openTime, closeTime, operatingHours, foodType, bestDishes: filteredBestDishes, menuLink, mapsLink });
        await newUser.save();

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
        const { contactNumber, name, status, profilePictureUrl, openTime, closeTime, operatingHours, foodType, bestDishes, menuLink, mapsLink } = req.body;

        const user = await User.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Basic validation for updates
        if (bestDishes) {
            if (bestDishes.length < 3 || bestDishes.slice(0, 3).some((dish: any) => !dish.name || !dish.name.trim())) {
                res.status(400).json({ message: 'At least first 3 best dishes are required and must have a name' });
                return;
            }
        }

        // Filter out bestDishes without a name before saving
        const filteredBestDishes = bestDishes ? bestDishes.filter((dish: any) => dish.name && dish.name.trim()) : user.bestDishes; // Keep existing if no new dishes provided

        if (contactNumber) user.contactNumber = contactNumber;
        if (name) user.name = name;
        if (status) user.status = status;
        if (profilePictureUrl) user.profilePictureUrl = profilePictureUrl;
        if (openTime) user.openTime = openTime;
        if (closeTime) user.closeTime = closeTime;
        if (operatingHours) user.operatingHours = operatingHours;
        if (foodType) user.foodType = foodType;
        user.bestDishes = filteredBestDishes;
        if (menuLink) user.menuLink = menuLink;
        if (mapsLink) user.mapsLink = mapsLink;

        user.updatedAt = new Date(); // Manually update updatedAt

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

export default router; 