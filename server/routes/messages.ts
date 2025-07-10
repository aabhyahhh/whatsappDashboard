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

export default router; 