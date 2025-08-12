// Updated webhook.ts - Key fixes for authentication
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { client, createFreshClient } from '../twilio.js'; // Import both
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';
import SupportCallLog from '../models/SupportCallLog.js';
import SupportCallReminderLog from '../models/SupportCallReminderLog.js';
import LoanReplyLog from '../models/LoanReplyLog.js';
import Vendor from '../models/Vendor.js';

// ... other imports remain the same

const router = Router();
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// FIXED: Helper function to get a working Twilio client
const getTwilioClient = () => {
  // Always create a fresh client to avoid authentication issues
  const freshClient = createFreshClient();
  if (freshClient) {
    console.log('✅ Created fresh Twilio client');
    return freshClient;
  }
  
  // Fallback to global client
  if (client) {
    console.log('✅ Using existing global Twilio client');
    return client;
  }
  
  console.error('❌ No Twilio client available');
  return null;
};

// ADDED: Comprehensive credential verification
const verifyTwilioCredentials = async (twilioClient: twilio.Twilio) => {
  try {
    // Test with account fetch
    const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Twilio credentials verified - Account:', account.friendlyName);
    return true;
  } catch (error) {
    console.error('❌ Twilio credential verification failed:', error);
    return false;
  }
};

// FIXED: Enhanced message sending with better error handling
const sendTwilioMessage = async (messagePayload: any, templateType: string) => {
  const twilioClient = getTwilioClient();
  if (!twilioClient) {
    console.error('❌ No Twilio client available for sending message');
    return false;
  }

  // Verify credentials before sending
  const isValid = await verifyTwilioCredentials(twilioClient);
  if (!isValid) {
    console.error('❌ Twilio credentials invalid, cannot send message');
    return false;
  }

  try {
    console.log(`🔍 Attempting to send ${templateType} message...`);
    console.log('📤 Message payload:', JSON.stringify(messagePayload, null, 2));
    
    const twilioResp = await twilioClient.messages.create(messagePayload);
    console.log(`✅ ${templateType} message sent successfully:`, twilioResp.sid);
    return twilioResp;
  } catch (error) {
    console.error(`❌ ${templateType} message failed:`, error);
    
    // If it's an auth error, try creating a completely new client
    if ((error as any)?.code === 20003) {
      console.log('🔄 Attempting with completely fresh client due to auth error...');
      try {
        const newClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
        const retryResp = await newClient.messages.create(messagePayload);
        console.log(`✅ ${templateType} message sent with fresh client:`, retryResp.sid);
        return retryResp;
      } catch (retryError) {
        console.error(`❌ ${templateType} message failed even with fresh client:`, retryError);
      }
    }
    return false;
  }
};

// Helper function to extract coordinates from Google Maps URL
function extractCoordinatesFromGoogleMaps(url: string): { latitude: number; longitude: number } | null {
    try {
        // Handle Google Maps URLs with ?q=lat,lng format
        const qParamMatch = url.match(/[?&]q=([^&]+)/);
        if (qParamMatch) {
            const coords = qParamMatch[1].split(',');
            if (coords.length === 2) {
                const lat = parseFloat(coords[0]);
                const lng = parseFloat(coords[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { latitude: lat, longitude: lng };
                }
            }
        }

        // Handle Google Maps URLs with @lat,lng format
        const atParamMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atParamMatch) {
            const lat = parseFloat(atParamMatch[1]);
            const lng = parseFloat(atParamMatch[2]);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { latitude: lat, longitude: lng };
            }
        }

        // Handle Google Maps URLs with /@lat,lng format
        const slashAtMatch = url.match(/\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (slashAtMatch) {
            const lat = parseFloat(slashAtMatch[1]);
            const lng = parseFloat(slashAtMatch[2]);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { latitude: lat, longitude: lng };
            }
        }

        return null;
    } catch (error) {
        console.error('Error extracting coordinates from Google Maps URL:', (error as Error)?.message);
        return null;
    }
}

// Helper function to extract coordinates from WhatsApp location sharing
function extractCoordinatesFromWhatsAppLocation(body: string): { latitude: number; longitude: number } | null {
    try {
        // WhatsApp location sharing typically includes coordinates in the message body
        // Look for patterns like "Location: lat, lng" or similar
        const locationMatch = body.match(/Location:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/i);
        if (locationMatch) {
            const lat = parseFloat(locationMatch[1]);
            const lng = parseFloat(locationMatch[2]);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { latitude: lat, longitude: lng };
            }
        }

        // Look for coordinates in various formats
        const coordPatterns = [
            /(-?\d+\.\d+),\s*(-?\d+\.\d+)/,  // lat, lng
            /lat[itude]*:\s*(-?\d+\.\d+).*?lng[itude]*:\s*(-?\d+\.\d+)/i,  // lat: x, lng: y
            /coordinates?:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/i,  // coordinates: lat, lng
        ];

        for (const pattern of coordPatterns) {
            const match = body.match(pattern);
            if (match) {
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { latitude: lat, longitude: lng };
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Error extracting coordinates from WhatsApp location:', (error as Error)?.message);
        return null;
    }
}

// Helper function to check if message contains location data
function extractLocationFromMessage(body: string): { latitude: number; longitude: number } | null {
    // Check for Google Maps links
    if (body.includes('maps.google.com') || body.includes('goo.gl/maps') || body.includes('maps.app.goo.gl')) {
        const coords = extractCoordinatesFromGoogleMaps(body);
        if (coords) {
            console.log('📍 Extracted coordinates from Google Maps link:', coords);
            return coords;
        }
    }

    // Check for WhatsApp location sharing
    const whatsappCoords = extractCoordinatesFromWhatsAppLocation(body);
    if (whatsappCoords) {
        console.log('📍 Extracted coordinates from WhatsApp location:', whatsappCoords);
        return whatsappCoords;
    }

    return null;
}

// Main webhook handler
router.post('/', async (req: Request, res: Response) => {
    try {
        console.log('Incoming Twilio webhook payload:', req.body);
        
        // Handle WARNING payloads (existing logic)
        if (req.body.Level === 'WARNING' || req.body.PayloadType === 'application/json') {
            console.log('Received Twilio WARNING payload:', req.body);
            if (req.body.Payload) {
                try {
                    const payloadData = JSON.parse(req.body.Payload);
                    console.log('Parsed warning payload data:', payloadData);
                    
                    if (payloadData.webhook && payloadData.webhook.request && payloadData.webhook.request.parameters) {
                        const params = payloadData.webhook.request.parameters;
                        console.log('Extracted parameters from warning payload:', params);
                        req.body = params;
                    } else {
                        console.log('No valid message parameters found in warning payload');
                        return res.status(200).send('OK');
                    }
                } catch (parseError) {
                    console.error('Failed to parse warning payload:', parseError);
                    return res.status(200).send('OK');
                }
            } else {
                console.log('No payload data in warning message');
                return res.status(200).send('OK');
            }
        }
        
        const { From, To, Body, Latitude, Longitude, Address, Label } = req.body;

        if (!From || !To) {
            console.error('Missing From or To in webhook payload:', req.body);
            return res.status(400).json({ error: 'Missing required fields: From or To' });
        }

        const hasBody = Body !== undefined;
        const hasCoordinates = Latitude !== undefined && Longitude !== undefined;
        
        if (!hasBody && !hasCoordinates) {
            console.error('Missing both Body and coordinates in webhook payload:', req.body);
            return res.status(400).json({ error: 'Missing required fields: Body or coordinates' });
        }

        // Skip self-messages
        if (twilioNumber && From.replace('whatsapp:', '') === twilioNumber.replace('whatsapp:', '')) {
            console.log('Skipping saving message from own Twilio number as inbound.');
            return res.status(200).send('OK');
        }

        let location: { latitude: number; longitude: number } | null = null;
        let address = undefined;
        let label = undefined;

        // 1. Prefer Twilio's native location fields
        if (hasCoordinates) {
            const lat = parseFloat(Latitude);
            const lng = parseFloat(Longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                location = { latitude: lat, longitude: lng };
                address = Address;
                label = Label;
                console.log('📍 Extracted coordinates from Twilio location fields:', location);
            }
        }

        // 2. If not present, try to extract from message body
        if (!location && hasBody) {
            location = extractLocationFromMessage(Body);
        }

        // Save message
        const messageData: Record<string, unknown> = {
            from: From,
            to: To,
            body: Body || '[location message]',
            direction: 'inbound',
            timestamp: new Date(),
        };

        // Always add location, address, and label if extracted
        if (location) {
            messageData.location = location;
            if (address) messageData.address = address;
            if (label) messageData.label = label;
        }

        console.log('Saving message with data:', messageData);
        const message = new Message(messageData);
        await message.save();

        console.log('✅ Saved inbound message:', {
            from: message.from,
            to: message.to,
            body: message.body,
            timestamp: message.timestamp,
            location: message.location ? 'Location included' : 'No location',
            address: message.get('address') || undefined,
            label: message.get('label') || undefined,
        });

        // Update User's and Vendor's location and mapsLink if possible
        if (location) {
            try {
                // Remove 'whatsapp:' prefix if present
                const phone = From.replace('whatsapp:', '');
                console.log('Looking up user with contactNumber:', phone);
                
                // Find all users with this contactNumber (in all fallback forms)
                const userNumbers = [phone];
                if (phone.startsWith('+91')) userNumbers.push(phone.replace('+91', '91'));
                if (phone.startsWith('+')) userNumbers.push(phone.substring(1));
                userNumbers.push(phone.slice(-10));
                
                const users = await User.find({ contactNumber: { $in: userNumbers } });
                console.log('Users found:', users.length);
                
                for (const user of users) {
                    user.location = {
                        type: 'Point',
                        coordinates: [location.longitude, location.latitude],
                    };
                    user.mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
                    await user.save();
                    console.log(`✅ Updated user location for ${user.contactNumber}`);
                }
                
                // Also update Vendor location if a vendor with this contactNumber exists
                const VendorModel = (await import('../models/Vendor.js')).default;
                const vendors = await VendorModel.find({ contactNumber: { $in: userNumbers } });
                
                for (const vendor of vendors) {
                    vendor.location = {
                        type: 'Point',
                        coordinates: [location.longitude, location.latitude],
                    };
                    vendor.mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
                    await vendor.save();
                    console.log(`✅ Updated vendor location for ${vendor.contactNumber}`);
                }
            } catch (err) {
                console.error('❌ Failed to update user or vendor location:', err);
            }
        }

        // FIXED: Handle greeting with improved message sending
        if (hasBody && typeof Body === 'string') {
            const normalized = Body.trim().toLowerCase();
            if (/^(hi+|hello+|hey+)$/.test(normalized)) {
                console.log('Attempting to send template message in response to greeting');
                
                const msgPayload = {
                    from: To, // Use To as-is (should already include whatsapp:)
                    to: From, // Use From as-is
                    contentSid: 'HX46464a13f80adebb4b9d552d63acfae9',
                };
                
                // Add messaging service SID if available
                if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                    (msgPayload as any).messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                }
                
                const success = await sendTwilioMessage(msgPayload, 'greeting template');
                
                if (success) {
                    // Save the outbound message to DB
                    try {
                        await Message.create({
                            from: msgPayload.from,
                            to: msgPayload.to,
                            body: "👋 Namaste from Laari Khojo!\n🙏 लारी खोजो की ओर से नमस्ते!\n\n📩 Thanks for reaching out!\n📞 संपर्क करने के लिए धन्यवाद!",
                            direction: 'outbound',
                            timestamp: new Date(),
                        });
                        console.log('✅ Outbound template message saved to DB');
                    } catch (err) {
                        console.error('❌ Failed to save outbound template message:', err);
                    }
                }
            }
            
            // Handle loan keyword
            if (/\bloan\b/i.test(Body)) {
                console.log('Attempting to send template message in response to loan keyword');
                
                // Log the loan reply
                try {
                    const phone = From.replace('whatsapp:', '');
                    const userNumbers = [phone];
                    if (phone.startsWith('+91')) userNumbers.push(phone.replace('+91', '91'));
                    if (phone.startsWith('+')) userNumbers.push(phone.substring(1));
                    userNumbers.push(phone.slice(-10));
                    
                    // Find user/vendor name
                    let vendorName = '';
                    const user = await User.findOne({ contactNumber: { $in: userNumbers } });
                    if (user && user.name) {
                        vendorName = user.name;
                    } else {
                        const vendor = await Vendor.findOne({ contactNumber: { $in: userNumbers } });
                        if (vendor && vendor.name) {
                            vendorName = vendor.name;
                        }
                    }
                    
                    // Check if already logged for this contactNumber and timestamp (within 1 minute)
                    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
                    const existingLog = await LoanReplyLog.findOne({
                        contactNumber: phone,
                        timestamp: { $gte: oneMinuteAgo }
                    });
                    
                    if (!existingLog) {
                        await LoanReplyLog.create({
                            vendorName: vendorName || 'Unknown',
                            contactNumber: phone,
                            timestamp: new Date(),
                            aadharVerified: user?.aadharNumber ? true : false
                        });
                        console.log(`✅ Logged loan reply from ${vendorName || 'Unknown'} (${phone})`);
                    } else {
                        console.log(`ℹ️ Loan reply already logged for ${phone} within last minute`);
                    }
                } catch (err) {
                    console.error('❌ Failed to log loan reply:', err);
                }
                
                const msgPayload = {
                    from: To,
                    to: From,
                    contentSid: 'HXcdbf14c73f068958f96efc216961834d',
                };
                
                if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                    (msgPayload as any).messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                }
                
                await sendTwilioMessage(msgPayload, 'loan template');
            }
        }

        // Update contact
        const phone = From.replace('whatsapp:', '');
        await Contact.findOneAndUpdate(
            { phone: phone },
            { 
                phone: phone,
                lastSeen: new Date(),
                updatedAt: new Date()
            },
            { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true 
            }
        );
        console.log('✅ Upserted contact:', { phone, lastSeen: new Date() });

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing webhook:', (error as Error)?.message);
        res.status(200).send('OK');
    }
});

// ADDED: Debug endpoint to test message sending
router.post('/test-send', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Missing to or message' });
    }
    
    const twilioClient = getTwilioClient();
    if (!twilioClient) {
      return res.status(500).json({ error: 'Twilio client not available' });
    }
    
    // Verify credentials first
    const isValid = await verifyTwilioCredentials(twilioClient);
    if (!isValid) {
      return res.status(500).json({ error: 'Invalid Twilio credentials' });
    }
    
    const msgPayload = {
      from: twilioNumber,
      to: to,
      body: message
    };
    
    const result = await twilioClient.messages.create(msgPayload);
    res.json({ success: true, messageSid: result.sid });
    
  } catch (error) {
    console.error('❌ Test send failed:', error);
    res.status(500).json({ 
      error: 'Test send failed', 
      message: (error as Error)?.message,
      code: (error as any)?.code 
    });
  }
});

// Support calls routes
router.get('/support-calls', async (req: Request, res: Response) => {
    try {
        // Get ALL support calls without any time restriction
        const supportCalls = await SupportCallLog.find({}).sort({ timestamp: -1 });
        
        res.json(supportCalls);
    } catch (error) {
        console.error('Error fetching support calls:', error);
        res.status(500).json({ error: 'Failed to fetch support calls' });
    }
});

// Debug endpoint to see all support calls (without 24-hour filter)
router.get('/support-calls-all', async (req: Request, res: Response) => {
    try {
        const allSupportCalls = await SupportCallLog.find({}).sort({ timestamp: -1 });
        res.json(allSupportCalls);
    } catch (error) {
        console.error('Error fetching all support calls:', error);
        res.status(500).json({ error: 'Failed to fetch all support calls' });
    }
});

router.patch('/support-calls/:id/complete', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { completedBy } = req.body;
        
        const supportCall = await SupportCallLog.findByIdAndUpdate(
            id,
            {
                completed: true,
                completedBy: completedBy || 'Unknown',
                completedAt: new Date()
            },
            { new: true }
        );
        
        if (!supportCall) {
            return res.status(404).json({ error: 'Support call not found' });
        }
        
        res.json(supportCall);
    } catch (error) {
        console.error('Error completing support call:', error);
        res.status(500).json({ error: 'Failed to complete support call' });
    }
});

// Loan replies route
router.get('/loan-replies', async (req: Request, res: Response) => {
    try {
        // Get ALL loan replies without any time restriction
        const loanReplies = await LoanReplyLog.find({}).sort({ timestamp: -1 });
        
        res.json(loanReplies);
    } catch (error) {
        console.error('Error fetching loan replies:', error);
        res.status(500).json({ error: 'Failed to fetch loan replies' });
    }
});

// Message health check route
router.get('/message-health', async (req: Request, res: Response) => {
    try {
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        
        // Get all outbound messages in the last 48 hours
        const outboundMessages = await Message.find({
            direction: 'outbound',
            timestamp: { $gte: fortyEightHoursAgo }
        }).sort({ timestamp: -1 });
        
        // Define message types and their template IDs
        const messageTypes = {
            'Vendor Reminder': 'HXbdb716843483717790c45c951b71701e',
            'Support Call Reminder': 'HX4c78928e13eda15597c00ea0915f1f77',
            'Loan Support': 'HXcdbf14c73f068958f96efc216961834d',
            'Welcome Message': 'HXc2e10711c3a3cbb31203854bccc39d2d',
            'Greeting Response': 'HX46464a13f80adebb4b9d552d63acfae9',
            'Loan Support Template': 'HXf4635b59c1abf466a77814b40dc1c362',
            'General Template': 'HX5364d2f0c0cce7ac9e38673572a45d15'
        };
        
        // Categorize messages by type
        const categorizedMessages: any = {};
        const unknownMessages: any[] = [];
        
        for (const message of outboundMessages) {
            let categorized = false;
            
            // Check if message body contains template ID
            for (const [type, templateId] of Object.entries(messageTypes)) {
                if (message.body && message.body.includes(templateId)) {
                    if (!categorizedMessages[type]) {
                        categorizedMessages[type] = [];
                    }
                    categorizedMessages[type].push({
                        to: message.to,
                        timestamp: message.timestamp,
                        body: message.body.substring(0, 100) + '...'
                    });
                    categorized = true;
                    break;
                }
            }
            
            if (!categorized) {
                unknownMessages.push({
                    to: message.to,
                    timestamp: message.timestamp,
                    body: message.body
                });
            }
        }
        
        // Get support call reminder logs
        const supportCallLogs = await SupportCallReminderLog.find({
            sentAt: { $gte: fortyEightHoursAgo }
        }).sort({ sentAt: -1 });
        
        // Get loan reply logs
        const loanReplyLogs = await LoanReplyLog.find({
            timestamp: { $gte: fortyEightHoursAgo }
        }).sort({ timestamp: -1 });
        
        // Calculate statistics
        const stats = {
            totalOutboundMessages: outboundMessages.length,
            totalSupportCallReminders: supportCallLogs.length,
            totalLoanReplies: loanReplyLogs.length,
            messageTypes: Object.keys(categorizedMessages).map(type => ({
                type,
                count: categorizedMessages[type]?.length || 0
            })),
            unknownMessagesCount: unknownMessages.length
        };
        
        res.json({
            stats,
            categorizedMessages,
            unknownMessages: unknownMessages.slice(0, 10), // Limit to first 10
            supportCallLogs: supportCallLogs.slice(0, 10),
            loanReplyLogs: loanReplyLogs.slice(0, 10),
            timeRange: {
                from: fortyEightHoursAgo,
                to: new Date()
            }
        });
        
    } catch (error) {
        console.error('Error fetching message health data:', error);
        res.status(500).json({ error: 'Failed to fetch message health data' });
    }
});

// Debug endpoint to see all loan replies (without time filter)
router.get('/loan-replies-all', async (req: Request, res: Response) => {
    try {
        const allLoanReplies = await LoanReplyLog.find({}).sort({ timestamp: -1 });
        res.json(allLoanReplies);
    } catch (error) {
        console.error('Error fetching all loan replies:', error);
        res.status(500).json({ error: 'Failed to fetch all loan replies' });
    }
});

// Inactive vendors route - OPTIMIZED VERSION
router.get('/inactive-vendors', async (req: Request, res: Response) => {
    try {
        const startTime = Date.now();
        
        // Get query parameters for pagination
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page
        const skip = (page - 1) * limit;
        
        // Get contacts who haven't been active in the last 3 days
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        console.log(`🔍 Fetching inactive vendors - Page: ${page}, Limit: ${limit}`);
        
        // OPTIMIZATION 1: Use aggregation pipeline for better performance
        const inactiveVendors = await Contact.aggregate([
            // Step 1: Find inactive contacts
            {
                $match: {
                    lastSeen: { $lt: threeDaysAgo }
                }
            },
            // Step 2: Lookup vendor information
            {
                $lookup: {
                    from: 'users', // MongoDB collection name for User model
                    localField: 'phone',
                    foreignField: 'contactNumber',
                    as: 'vendor'
                }
            },
            // Step 3: Unwind vendor array (since lookup returns array)
            {
                $unwind: '$vendor'
            },
            // Step 4: Lookup recent reminder logs
            {
                $lookup: {
                    from: 'supportcallreminderlogs', // MongoDB collection name
                    let: { contactPhone: '$phone' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$contactNumber', '$$contactPhone'] },
                                        { $gte: ['$sentAt', twentyFourHoursAgo] }
                                    ]
                                }
                            }
                        },
                        { $sort: { sentAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'recentReminder'
                }
            },
            // Step 5: Calculate days inactive
            {
                $addFields: {
                    daysInactive: {
                        $floor: {
                            $divide: [
                                { $subtract: [new Date(), '$lastSeen'] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    },
                    reminderStatus: {
                        $cond: {
                            if: { $gt: [{ $size: '$recentReminder' }, 0] },
                            then: 'Sent',
                            else: 'Not sent'
                        }
                    },
                    reminderSentAt: {
                        $ifNull: [
                            { $arrayElemAt: ['$recentReminder.sentAt', 0] },
                            null
                        ]
                    }
                }
            },
            // Step 6: Project only needed fields
            {
                $project: {
                    _id: 1,
                    phone: 1,
                    lastSeen: 1,
                    daysInactive: 1,
                    reminderStatus: 1,
                    reminderSentAt: 1,
                    name: '$vendor.name'
                }
            },
            // Step 7: Sort by last seen (most recent first)
            {
                $sort: { lastSeen: -1 }
            },
            // Step 8: Apply pagination
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);
        
        // Get total count for pagination info
        const totalCount = await Contact.countDocuments({
            lastSeen: { $lt: threeDaysAgo }
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ Inactive vendors fetched in ${duration}ms - Found: ${inactiveVendors.length}/${totalCount}`);
        
        res.json({
            vendors: inactiveVendors,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit),
                hasNext: page * limit < totalCount,
                hasPrev: page > 1
            },
            performance: {
                duration: `${duration}ms`,
                optimized: true
            }
        });
        
    } catch (error) {
        console.error('Error fetching inactive vendors:', error);
        res.status(500).json({ error: 'Failed to fetch inactive vendors' });
    }
});

// Debug endpoint to check for messages with the specific template
router.get('/debug-template-messages', async (req: Request, res: Response) => {
    try {
        // Check for messages containing the template ID
        const templateMessages = await Message.find({
            body: { $regex: /HX4c78928e13eda15597c00ea0915f1f77/ }
        }).sort({ timestamp: -1 });
        
        res.json({
            totalTemplateMessages: templateMessages.length,
            messages: templateMessages
        });
    } catch (error) {
        console.error('Error fetching template messages:', error);
        res.status(500).json({ error: 'Failed to fetch template messages' });
    }
});

// Debug endpoint to check all messages
router.get('/debug-all-messages', async (req: Request, res: Response) => {
    try {
        const allMessages = await Message.find({}).sort({ timestamp: -1 }).limit(10);
        
        res.json({
            totalMessages: await Message.countDocuments(),
            recentMessages: allMessages
        });
    } catch (error) {
        console.error('Error fetching all messages:', error);
        res.status(500).json({ error: 'Failed to fetch all messages' });
    }
});

// Debug endpoint to check for any template-like messages
router.get('/debug-template-patterns', async (req: Request, res: Response) => {
    try {
        // Check for messages that might be templates
        const templatePatterns = await Message.find({
            $or: [
                { body: { $regex: /HX/ } },
                { body: { $regex: /template/ } },
                { body: { $regex: /reminder/ } },
                { direction: 'outbound' }
            ]
        }).sort({ timestamp: -1 }).limit(20);
        
        res.json({
            totalTemplatePatterns: templatePatterns.length,
            messages: templatePatterns
        });
    } catch (error) {
        console.error('Error fetching template patterns:', error);
        res.status(500).json({ error: 'Failed to fetch template patterns' });
    }
});

// Debug endpoint to check inactive contacts logic
router.get('/debug-inactive-contacts', async (req: Request, res: Response) => {
    try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        
        // Find contacts who haven't been active recently
        const inactiveContacts = await Contact.find({
            lastSeen: { $lt: threeDaysAgo }
        }).sort({ lastSeen: -1 });
        
        // Check which ones received support call templates
        const contactsWithTemplates = [];
        
        for (const contact of inactiveContacts) {
            const receivedTemplate = await Message.findOne({
                to: contact.phone,
                direction: 'outbound',
                body: { $regex: /Support call follow-up template sent/ }
            });
            
            if (receivedTemplate) {
                const responseAfterTemplate = await Message.findOne({
                    from: contact.phone,
                    direction: 'inbound',
                    timestamp: { $gt: receivedTemplate.timestamp }
                });
                
                contactsWithTemplates.push({
                    contact: contact,
                    templateReceived: !!receivedTemplate,
                    templateTimestamp: receivedTemplate?.timestamp,
                    respondedAfterTemplate: !!responseAfterTemplate,
                    responseTimestamp: responseAfterTemplate?.timestamp
                });
            }
        }
        
        res.json({
            threeDaysAgo: threeDaysAgo,
            totalInactiveContacts: inactiveContacts.length,
            contactsWithTemplates: contactsWithTemplates
        });
    } catch (error) {
        console.error('Error debugging inactive contacts:', error);
        res.status(500).json({ error: 'Failed to debug inactive contacts' });
    }
});

// Send reminder to inactive vendor
router.post('/send-reminder/:vendorId', async (req: Request, res: Response) => {
    try {
        const { vendorId } = req.params;
        
        // Find the contact by ID
        const contact = await Contact.findById(vendorId);
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        
        // Find the corresponding vendor to get the name
        const vendor = await User.findOne({ contactNumber: contact.phone });
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found for this contact' });
        }
        
        // Check if reminder was already sent in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentReminder = await SupportCallReminderLog.findOne({
            contactNumber: contact.phone,
            sentAt: { $gte: twentyFourHoursAgo }
        });
        
        if (recentReminder) {
            return res.status(400).json({ error: 'Reminder already sent in the last 24 hours' });
        }
        
        // Send support call reminder message via Twilio
        const twilioClient = getTwilioClient();
        if (!twilioClient) {
            return res.status(500).json({ error: 'Twilio client not available' });
        }
        
        // Use the support call reminder template
        const messagePayload = {
            from: twilioNumber,
            to: `whatsapp:${contact.phone}`,
            contentSid: 'HX4c78928e13eda15597c00ea0915f1f77'
        };
        
        if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            (messagePayload as any).messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
        }
        
        const result = await twilioClient.messages.create(messagePayload);
        
        // Log the reminder send
        await SupportCallReminderLog.create({
            contactNumber: contact.phone,
            sentAt: new Date()
        });
        
        res.json({ 
            success: true, 
            messageSid: result.sid,
            vendor: vendor.name,
            phone: contact.phone
        });
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({ error: 'Failed to send reminder' });
    }
});

// ... rest of the routes remain the same

export default router;