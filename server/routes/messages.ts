import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Message } from '../models/Message.js';
import twilio from 'twilio';

const router = Router();

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = twilio(accountSid, authToken);

// POST /api/send - Send WhatsApp message via Twilio
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { to, body } = req.body;

        // Validate required fields
        if (!to || !body) {
            return res.status(400).json({ 
                error: 'Missing required fields: to and body are required' 
            });
        }

        // Validate Twilio configuration
        if (!accountSid || !authToken || !fromNumber) {
            console.error('Twilio configuration missing:', {
                accountSid: !!accountSid,
                authToken: !!authToken,
                fromNumber: !!fromNumber
            });
            return res.status(500).json({ 
                error: 'Twilio configuration not properly set up' 
            });
        }

        console.log(`📤 Sending WhatsApp message to ${to}: "${body}"`);

        // Send message via Twilio
        const message = await twilioClient.messages.create({
            body: body,
            from: `whatsapp:${fromNumber}`,
            to: `whatsapp:${to}`
        });

        console.log(`✅ Message sent successfully! SID: ${message.sid}`);

        // Save outbound message to MongoDB (Task 22)
        try {
            await Message.create({
                from: fromNumber,
                to: to,
                body: body,
                direction: 'outbound',
                timestamp: new Date(),
            });
            console.log('💾 Outbound message saved to MongoDB');
        } catch (dbError) {
            console.error('❌ Failed to save outbound message to MongoDB:', dbError);
        }

        res.json({ 
            success: true, 
            messageId: message.sid,
            status: message.status,
            to: to,
            body: body
        });

    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error);
        // Always return a JSON error response
        if (error instanceof Error) {
            if (error.message.includes('not a valid phone number')) {
                return res.status(400).json({ 
                    error: 'Invalid phone number format' 
                });
            }
            if (error.message.includes('authentication')) {
                return res.status(500).json({ 
                    error: 'Twilio authentication failed' 
                });
            }
        }
        // Pass to error-handling middleware for any other error
        next(error);
    }
});

// Error-handling middleware for this router
router.use((_err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error in /api/messages:', (_err as Error)?.message || _err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error', details: (_err as Error)?.message || _err });
    }
});

// GET /api/messages/inbound-count - Get count of inbound messages
router.get('/inbound-count', async (_req: Request, res: Response) => {
    try {
        const count = await Message.countDocuments({ direction: 'inbound' });
        res.json({ count });
    } catch (error) {
        console.error('Error counting inbound messages:', error);
        res.status(500).json({ error: 'Failed to count inbound messages' });
    }
});

// GET /api/messages/active-vendors-24h - Number of unique vendors who texted in last 24 hours
router.get('/active-vendors-24h', async (_req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Find inbound messages in last 24h
    const messages = await Message.find({
      direction: 'inbound',
      timestamp: { $gte: since }
    }).select('from');
    // Normalize phone numbers (remove whatsapp: prefix)
    const uniqueVendors = new Set(
      messages.map(m => (m.from || '').replace(/^whatsapp:/, ''))
    );
    res.json({ count: uniqueVendors.size });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active vendors in last 24h' });
  }
});

// GET /api/messages/active-vendor-list-24h - List of unique vendors who texted in last 24 hours
router.get('/active-vendor-list-24h', async (_req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Find inbound messages in last 24h
    const messages = await Message.find({
      direction: 'inbound',
      timestamp: { $gte: since }
    }).sort({ timestamp: -1 });
    // Map to unique contact numbers (remove whatsapp: prefix)
    const seen = new Set<string>();
    const vendors: { contactNumber: string; name: string }[] = [];
    for (const msg of messages) {
      const contactNumber = (msg.from || '').replace(/^whatsapp:/, '');
      if (!seen.has(contactNumber)) {
        // Try to get name from User or Vendor
        let name = '';
        const UserModel = (await import('../models/User.js')).User;
        const user = await UserModel.findOne({ contactNumber });
        if (user && user.name) {
          name = user.name;
        } else {
          const VendorModel = (await import('../models/Vendor.js')).default;
          const vendor = await VendorModel.findOne({ contactNumber });
          if (vendor && vendor.name) name = vendor.name;
        }
        vendors.push({ contactNumber, name });
        seen.add(contactNumber);
      }
    }
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active vendor list in last 24h' });
  }
});

// GET /api/messages/:phone - Fetch messages for a specific phone number
router.get('/:phone', async (req: Request, res: Response) => {
    try {
        const { phone } = req.params;
        const normalizedPhone = phone.replace(/^whatsapp:/, '');
        const phoneVariants = [
            phone,
            `whatsapp:${normalizedPhone}`
        ];

        // Find messages where 'from' or 'to' matches any variant of the phone number
        // Sort by timestamp in ascending order to show chronological chat
        const messages = await Message.find({
            $or: [
                { from: { $in: phoneVariants } },
                { to: { $in: phoneVariants } }
            ]
        }).sort({ timestamp: 1 });

        if (!messages.length) {
            return res.status(404).json({ message: 'No messages found for this contact.' });
        }

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});



export default router; 