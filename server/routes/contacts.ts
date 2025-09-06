import { Router } from 'express';
import type { Request, Response } from 'express';
import { Contact } from '../models/Contact.js';

const router = Router();

// GET /api/contacts - Fetch all contacts for sidebar (OPTIMIZED)
router.get('/', async (_req: Request, res: Response) => {
    try {
        const startTime = Date.now();
        
        // Fetch contacts sorted by lastSeen (most recent first)
        const contacts = await Contact.find({})
            .sort({ lastSeen: -1 })
            .select('phone lastSeen createdAt updatedAt')
            .lean(); // Use lean() for better performance

        // Batch fetch all vendor names in a single query
        const User = (await import('../models/User.js')).User;
        
        // Create phone number variations for efficient lookup
        const phoneVariations = contacts.flatMap(contact => {
            const phone = contact.phone;
            const normalized = phone.replace(/^\+91/, '').replace(/^91/, '').replace(/\D/g, '');
            return [
                phone,
                '+91' + normalized,
                '91' + normalized,
                normalized
            ];
        });

        // Single query to get all vendors with their phone numbers
        const vendors = await User.find({
            contactNumber: { $in: phoneVariations }
        })
        .select('name contactNumber')
        .lean();

        // Create a lookup map for O(1) access
        const vendorMap = new Map();
        vendors.forEach(vendor => {
            const normalized = vendor.contactNumber.replace(/^\+91/, '').replace(/^91/, '').replace(/\D/g, '');
            vendorMap.set(vendor.contactNumber, vendor.name);
            vendorMap.set('+91' + normalized, vendor.name);
            vendorMap.set('91' + normalized, vendor.name);
            vendorMap.set(normalized, vendor.name);
        });

        // Map contacts with vendor names
        const contactsWithNames = contacts.map(contact => {
            const name = vendorMap.get(contact.phone) || '';
            return { ...contact, name };
        });

        const totalTime = Date.now() - startTime;
        console.log(`📋 Contacts API: Fetched ${contactsWithNames.length} contacts in ${totalTime}ms`);

        res.json(contactsWithNames);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ message: (error as Error)?.message || error });
    }
});

// GET /api/contacts/:phone - Fetch specific contact
router.get('/:phone', async (req: Request, res: Response) => {
    try {
        const { phone } = req.params;
        const contact = await Contact.findOne({ phone }).lean();
        
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