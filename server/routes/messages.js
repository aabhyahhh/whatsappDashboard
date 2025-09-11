import { Router } from 'express';
import { Message } from '../models/Message.js';
import { sendTextMessage } from '../meta.js';
const router = Router();
// Meta WhatsApp API configuration
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
// POST /api/send - Send WhatsApp message via Twilio
router.post('/send', async (req, res, next) => {
    try {
        const { to, body } = req.body;
        // Validate required fields
        if (!to || !body) {
            return res.status(400).json({
                error: 'Missing required fields: to and body are required'
            });
        }
        // Validate Meta WhatsApp configuration
        if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
            console.error('Meta WhatsApp configuration missing:', {
                accessToken: !!META_ACCESS_TOKEN,
                phoneNumberId: !!META_PHONE_NUMBER_ID
            });
            return res.status(500).json({
                error: 'Meta WhatsApp configuration not properly set up'
            });
        }
        console.log(`📤 Sending WhatsApp message to ${to}: "${body}"`);
        // Send message via Meta WhatsApp API
        const result = await sendTextMessage(to, body);
        
        // Check if the message was actually sent successfully
        if (!result || !result.success) {
            console.error('❌ Failed to send message via Meta API:', result);
            return res.status(500).json({
                error: 'Failed to send message via Meta WhatsApp API',
                details: result?.error || 'Unknown error',
                metaResponse: result
            });
        }
        
        console.log(`✅ Message sent successfully via Meta API! Message ID: ${result.messageId}`);
        
        // Save outbound message to MongoDB
        try {
            await Message.create({
                from: META_PHONE_NUMBER_ID,
                to: to,
                body: body,
                direction: 'outbound',
                timestamp: new Date(),
                messageId: result.messageId,
                metaResponse: result
            });
            console.log('💾 Outbound message saved to MongoDB');
        }
        catch (dbError) {
            console.error('❌ Failed to save outbound message to MongoDB:', dbError);
        }
        
        res.json({
            success: true,
            messageId: result.messageId,
            status: 'sent',
            to: to,
            body: body,
            isTemplate: result.isTemplate || false,
            metaResponse: result
        });
    }
    catch (error) {
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
router.use((_err, _req, res, _next) => {
    console.error('Unhandled error in /api/messages:', _err?.message || _err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error', details: _err?.message || _err });
    }
});

// GET /api/messages/inbound-count - Get count of inbound messages
router.get('/inbound-count', async (_req, res) => {
    try {
        const count = await Message.countDocuments({ direction: 'inbound' });
        res.json({ count });
    }
    catch (error) {
        console.error('Error counting inbound messages:', error);
        res.status(500).json({ error: 'Failed to count inbound messages' });
    }
});

// GET /api/messages/:phone - Fetch messages for a specific phone number
router.get('/:phone', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

export default router;
