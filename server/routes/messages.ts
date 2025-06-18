import { Router, Request, Response } from 'express';
import { Message } from '../models/Message';
import twilio from 'twilio';

const router = Router();

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = twilio(accountSid, authToken);

// Helper function to escape special regex characters
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the matched substring
}

// POST /api/send - Send WhatsApp message via Twilio
router.post('/send', async (req: Request, res: Response) => {
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

        res.json({ 
            success: true, 
            messageId: message.sid,
            status: message.status,
            to: to,
            body: body
        });

    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error);
        
        // Handle Twilio-specific errors
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

        res.status(500).json({ 
            error: 'Failed to send WhatsApp message' 
        });
    }
});

// GET /api/messages/:phone - Fetch messages for a specific phone number
router.get('/:phone', async (req: Request, res: Response) => {
    try {
        const { phone } = req.params;
        const escapedPhone = escapeRegExp(phone); // Escape the phone number

        // Find messages where 'from' or 'to' matches the phone number
        // Sort by timestamp in ascending order to show chronological chat
        const messages = await Message.find({
            $or: [
                { from: new RegExp(escapedPhone, 'i') }, // Case-insensitive match for 'from'
                { to: new RegExp(escapedPhone, 'i') }    // Case-insensitive match for 'to'
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