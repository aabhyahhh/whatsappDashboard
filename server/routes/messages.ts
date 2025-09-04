import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Message } from '../models/Message.js';
import { sendTemplateMessage, sendTextMessage } from '../meta.js';

const router = Router();

// Meta WhatsApp API configuration
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

// POST /api/send - Send WhatsApp message via Meta WhatsApp API
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
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

        console.log(`✅ Message sent successfully via Meta API!`);

        // Save outbound message to MongoDB
        try {
            await Message.create({
                from: META_PHONE_NUMBER_ID,
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
            messageId: result.messageId || 'meta-' + Date.now(),
            status: 'sent',
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
            if (error.message.includes('authentication') || error.message.includes('Unauthorized')) {
                return res.status(500).json({ 
                    error: 'Meta WhatsApp authentication failed' 
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

// GET /api/messages/health - Get message health data for today
router.get('/health', async (_req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get today's outbound messages
        const todayMessages = await Message.find({
            direction: 'outbound',
            timestamp: { $gte: today, $lt: tomorrow }
        });

        // Get failed messages (messages with error fields)
        const failedMessages = await Message.find({
            direction: 'outbound',
            timestamp: { $gte: today, $lt: tomorrow },
            $or: [
                { errorCode: { $exists: true } },
                { errorMessage: { $exists: true } },
                { 'meta.type': 'error' }
            ]
        });

        // Get successful messages
        const successfulMessages = todayMessages.filter(msg => 
            !msg.errorCode && !msg.errorMessage && msg.meta?.type !== 'error'
        );



        // Format failed messages for display
        const failedMessagesFormatted = failedMessages.map(msg => ({
            contactNumber: msg.to,
            vendorName: msg.meta?.vendorName || 'Unknown',
            error: msg.errorMessage || msg.meta?.error || 'Unknown error',
            timestamp: msg.timestamp
        }));



        res.json({
            today: {
                total: todayMessages.length,
                successful: successfulMessages.length,
                failed: failedMessages.length
            },
            failedMessages: failedMessagesFormatted,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching message health data:', error);
        res.status(500).json({ error: 'Failed to fetch message health data' });
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
    const vendors: { contactNumber: string; name: string; lastContact: Date }[] = [];
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
        vendors.push({ contactNumber, name, lastContact: msg.timestamp });
        seen.add(contactNumber);
      }
    }
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active vendor list in last 24h' });
  }
});

// GET /api/messages/active-vendors-stats - Day-wise, week, and month unique vendor stats
router.get('/active-vendors-stats', async (_req, res) => {
  try {
    const now = new Date();
    // Get start of week (Monday)
    const dayOfWeek = (now.getDay() + 6) % 7; // 0=Monday, 6=Sunday
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    // Get start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Get all inbound messages from start of month
    const messages = await Message.find({
      direction: 'inbound',
      timestamp: { $gte: startOfMonth }
    }).select('from timestamp');
    // Helper to normalize phone
    const normalize = (n: string) => (n || '').replace(/^whatsapp:/, '');
    // Day-wise aggregation for current week
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const vendors = new Set();
      for (const msg of messages) {
        if (msg.timestamp >= day && msg.timestamp < nextDay) {
          vendors.add(normalize(msg.from));
        }
      }
      days.push({ date: day.toISOString().slice(0, 10), count: vendors.size });
    }
    // Week unique vendors
    const weekVendors = new Set();
    for (const msg of messages) {
      if (msg.timestamp >= startOfWeek && msg.timestamp < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        weekVendors.add(normalize(msg.from));
      }
    }
    // Month unique vendors
    const monthVendors = new Set(messages.map(msg => normalize(msg.from)));
    res.json({
      days,
      week: {
        start: startOfWeek.toISOString().slice(0, 10),
        end: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        count: weekVendors.size
      },
      month: {
        month: startOfMonth.toISOString().slice(0, 7),
        count: monthVendors.size
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active vendor stats' });
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

// POST /api/messages/send-support-call - Send support call message to vendor
router.post('/send-support-call', async (req: Request, res: Response) => {
    try {
        const { to, vendorName, template } = req.body;

        // Validate required fields
        if (!to || !vendorName) {
            return res.status(400).json({ 
                error: 'Missing required fields: to and vendorName are required' 
            });
        }

        console.log(`📞 Sending support call message to ${vendorName} (${to})`);

        // Send template message via Meta WhatsApp API
        const templateName = template || 'post_support_call_message_for_vendors';
        const result = await sendTemplateMessage(to, templateName);

        if (!result) {
            throw new Error('Failed to send template message');
        }

        // Save outbound message to MongoDB
        try {
            await Message.create({
                from: process.env.META_PHONE_NUMBER_ID,
                to: to,
                body: `Support call message sent to ${vendorName}`,
                direction: 'outbound',
                timestamp: new Date(),
                meta: {
                    type: 'support_call_message',
                    template: templateName,
                    vendorName: vendorName,
                    contactNumber: to
                }
            });
            console.log('💾 Support call message saved to MongoDB');
        } catch (dbError) {
            console.error('❌ Failed to save support call message to MongoDB:', dbError);
        }

        console.log(`✅ Support call message sent successfully to ${vendorName} (${to})`);

        res.json({ 
            success: true, 
            message: `Support call message sent to ${vendorName}`,
            vendorName: vendorName,
            contactNumber: to,
            template: templateName
        });

    } catch (error) {
        console.error('❌ Error sending support call message:', error);
        res.status(500).json({ 
            error: 'Failed to send support call message',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router; 