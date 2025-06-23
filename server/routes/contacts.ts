import { Router } from 'express';
import type { Request, Response } from 'express';
import { Contact } from '../models/Contact.js';

const router = Router();

// GET /api/contacts - Fetch all contacts for sidebar
router.get('/', async (_req: Request, res: Response) => {
    try {
        // Fetch contacts sorted by lastSeen (most recent first)
        const contacts = await Contact.find({})
            .sort({ lastSeen: -1 })
            .select('phone lastSeen createdAt updatedAt')
            .limit(50); // Limit to 50 most recent contacts for sidebar

        res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: (error as Error)?.message || error });
    }
});

// GET /api/contacts/:phone - Fetch specific contact
router.get('/:phone', async (req: Request, res: Response) => {
    try {
        const { phone } = req.params;
        const contact = await Contact.findOne({ phone });
        
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        res.json(contact);
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).json({ error: 'Failed to fetch contact' });
    }
});

// DELETE /api/contacts/delete-many - Delete multiple contacts by phone numbers (admin/test only)
router.delete('/delete-many', async (req: Request, res: Response) => {
    try {
        const { phones } = req.body;
        if (!Array.isArray(phones) || phones.length === 0) {
            return res.status(400).json({ error: 'phones array required' });
        }
        const result = await Contact.deleteMany({ phone: { $in: phones } });
        res.json({ deletedCount: result.deletedCount });
    } catch (error) {
        console.error('Error deleting contacts:', error);
        res.status(500).json({ error: 'Failed to delete contacts' });
    }
});

export default router; 