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

        // ... location extraction logic remains the same ...

        // Save message
        const messageData: Record<string, unknown> = {
            from: From,
            to: To,
            body: Body || '[location message]',
            direction: 'inbound',
            timestamp: new Date(),
        };

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
        // Get support calls from the last 7 days (extended from 24 hours)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const supportCalls = await SupportCallLog.find({
            timestamp: { $gte: sevenDaysAgo }
        }).sort({ timestamp: -1 });
        
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
        // Get loan replies from the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const loanReplies = await LoanReplyLog.find({
            timestamp: { $gte: twentyFourHoursAgo }
        }).sort({ timestamp: -1 });
        
        res.json(loanReplies);
    } catch (error) {
        console.error('Error fetching loan replies:', error);
        res.status(500).json({ error: 'Failed to fetch loan replies' });
    }
});

// Inactive vendors route
router.get('/inactive-vendors', async (req: Request, res: Response) => {
    try {
        // Get vendors who haven't been active in the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const inactiveVendors = await Vendor.find({
            lastSeen: { $lt: sevenDaysAgo }
        }).sort({ lastSeen: -1 });
        
        res.json(inactiveVendors);
    } catch (error) {
        console.error('Error fetching inactive vendors:', error);
        res.status(500).json({ error: 'Failed to fetch inactive vendors' });
    }
});

// Send reminder to inactive vendor
router.post('/send-reminder/:vendorId', async (req: Request, res: Response) => {
    try {
        const { vendorId } = req.params;
        
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        
        // Send reminder message via Twilio
        const twilioClient = getTwilioClient();
        if (!twilioClient) {
            return res.status(500).json({ error: 'Twilio client not available' });
        }
        
        const messagePayload = {
            from: twilioNumber,
            to: `whatsapp:${vendor.phone}`,
            body: "🔔 Reminder: Don't forget to stay active on Laari Khojo! Your customers are waiting for you."
        };
        
        const result = await twilioClient.messages.create(messagePayload);
        
        // Update vendor's last reminder sent
        vendor.lastReminderSent = new Date();
        await vendor.save();
        
        res.json({ 
            success: true, 
            messageSid: result.sid,
            vendor: vendor
        });
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({ error: 'Failed to send reminder' });
    }
});

// ... rest of the routes remain the same

export default router;