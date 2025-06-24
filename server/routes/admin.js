import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.js';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Ensure this matches auth.ts
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
// Middleware to verify JWT and check for admin role
const authenticateToken = (req, res, next) => {
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
        req.user = user;
        next();
    });
};
// Middleware to check if user has super_admin role
const authorizeSuperAdmin = (req, res, next) => {
    if (req.user?.role !== 'super_admin') {
        res.status(403).json({ message: 'Access denied: Requires super_admin role' });
        return;
    }
    next();
};
// GET all admin users
router.get('/users', authenticateToken, authorizeSuperAdmin, asyncHandler(async (_req, res) => {
    const admins = await Admin.find().select('-password'); // Exclude passwords
    res.json(admins);
}));
// POST create a new admin user
router.post('/users', authenticateToken, authorizeSuperAdmin, asyncHandler(async (req, res) => {
    const { username, password, email, role } = req.body;
    // Basic validation
    if (!username || !password || !email) {
        res.status(400).json({ message: 'Username, password, and email are required' });
        return;
    }
    // Check if username or email already exists
    const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existingAdmin) {
        res.status(409).json({ message: 'User with that username or email already exists' });
        return;
    }
    const newAdmin = new Admin({ username, password, email, role });
    await newAdmin.save();
    res.status(201).json({ message: 'Admin user created successfully', admin: { id: newAdmin._id, username: newAdmin.username, email: newAdmin.email, role: newAdmin.role } });
}));
// PUT update an admin user by ID
router.put('/users/:id', authenticateToken, authorizeSuperAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { username, password, email, role } = req.body;
    const admin = await Admin.findById(id);
    if (!admin) {
        res.status(404).json({ message: 'Admin user not found' });
        return;
    }
    // Prevent super_admin from changing their own role to something else or from being deleted by themselves
    if (req.user?.id === id && role && req.user.role !== role) {
        res.status(403).json({ message: 'Cannot change your own role' });
        return;
    }
    if (username)
        admin.username = username;
    if (email)
        admin.email = email;
    if (role)
        admin.role = role;
    // Hash password only if it's provided and changed
    if (password) {
        admin.password = password; // Pre-save hook will handle hashing
    }
    await admin.save();
    res.json({ message: 'Admin user updated successfully', admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role } });
}));
// DELETE an admin user by ID
router.delete('/users/:id', authenticateToken, authorizeSuperAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    // Prevent a super_admin from deleting themselves
    if (req.user?.id === id && req.user.role === 'super_admin') {
        res.status(403).json({ message: 'Cannot delete your own super_admin account' });
        return;
    }
    const result = await Admin.findByIdAndDelete(id);
    if (!result) {
        res.status(404).json({ message: 'Admin user not found' });
        return;
    }
    res.json({ message: 'Admin user deleted successfully' });
}));
export default router;
