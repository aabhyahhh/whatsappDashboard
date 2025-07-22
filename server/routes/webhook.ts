import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { client } from '../twilio.js';
import { User } from '../models/User.js';
// @ts-ignore: Importing JS model with separate .d.ts for types
import LoanReplyLog from '../models/LoanReplyLog.js';
import SupportCallLog from '../models/SupportCallLog.js';
import jwt from 'jsonwebtoken';

const router = Router();

const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

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

// Webhook endpoint to receive Twilio messages
router.post('/', async (req: Request, res: Response) => {
    try {
        // Debug log: print the entire incoming Twilio webhook payload
        console.log('Incoming Twilio webhook payload:', req.body);
        // Extract all relevant fields from the Twilio webhook payload
        const { From, To, Body, Latitude, Longitude, Address, Label } = req.body;

        // Basic validation - must have From and To, and either Body or coordinates
        if (!From || !To) {
            console.error('Missing From or To in webhook payload:', req.body);
            return res.status(400).json({ error: 'Missing required fields: From or To' });
        }

        // Check if we have either a body or location coordinates
        const hasBody = Body !== undefined;
        const hasCoordinates = Latitude !== undefined && Longitude !== undefined;
        
        if (!hasBody && !hasCoordinates) {
            console.error('Missing both Body and coordinates in webhook payload:', req.body);
            return res.status(400).json({ error: 'Missing required fields: Body or coordinates' });
        }

        // Only save as inbound if From is NOT your Twilio number
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

        // Create new message document
        const messageData: any = {
            from: From,
            to: To,
            body: Body || '[location message]', // Use a placeholder if Body is empty
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
        // Save message to MongoDB
        const message = new Message(messageData);
        await message.save();

        // Update User's and Vendor's location and mapsLink if possible
        if (location) {
            try {
                // Remove 'whatsapp:' prefix if present
                const phone = From.replace('whatsapp:', '');
                console.log('Looking up user with contactNumber:', phone);
                // Remove all findOne lookups for user and vendor by contactNumber, use find to get all matches
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
        
        console.log('✅ Saved inbound message:', {
            from: message.from,
            to: message.to,
            body: message.body.length > 0 ? message.body.substring(0, 50) + (message.body.length > 50 ? '...' : '') : '[Empty body - location message]',
            timestamp: message.timestamp,
            location: message.location && message.location.latitude && message.location.longitude ? '📍 Location included' : 'No location',
            address: message.get('address') || undefined,
            label: message.get('label') || undefined,
        });

        // If the inbound message is a greeting (hi, hello, hey, etc.), send the template message
        if (hasBody && typeof Body === 'string') {
            const normalized = Body.trim().toLowerCase();
            // Match greetings: hi, hello, hey, heyy, heyyy, etc.
            if (/^(hi+|hello+|hey+)$/.test(normalized)) {
                console.log('Attempting to send template message in response to greeting');
                if (client) {
                    try {
                        const msgPayload: any = {
                            from: `whatsapp:${To.replace('whatsapp:', '')}`,
                            to: From,
                            contentSid: 'HX46464a13f80adebb4b9d552d63acfae9',
                            contentVariables: JSON.stringify({})
                        };
                        if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                            msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                        }
                        const twilioResp = await client.messages.create(msgPayload);
                        console.log('✅ Triggered outbound template message HX46464a13f80adebb4b9d552d63acfae9 in response to greeting. Twilio response:', twilioResp);

                        // Save the outbound template message to MongoDB for chat display
                        try {
                            await Message.create({
                                from: msgPayload.from,
                                to: msgPayload.to,
                                body: "👋 Namaste from Laari Khojo!\n🙏 लारी खोजो की ओर से नमस्ते!\n\n📩 Thanks for reaching out!\n📞 संपर्क करने के लिए धन्यवाद!\n\nWe help you get discovered by more customers by showing your updates and services on our platform.\n🧺 हम आपके अपडेट्स और सेवाओं को अपने प्लेटफॉर्म पर दिखाकर आपको ज़्यादा ग्राहकों तक पहुँचाने में मदद करते हैं।\n\n💰 Interested in future loan support?\nJust reply with: *loan*\nभविष्य में लोन सहायता चाहिए?\n➡️ जवाब में भेजें: *loan*\n\nYou can also visit our 🌐 website using the button below.\nआप नीचे दिए गए बटन से हमारी 🌐 वेबसाइट पर भी जा सकते हैं।\n\n🚀 Let’s grow your laari together!\n🌟 आइए मिलकर आपकी लारी को आगे बढ़ाएं!",
                                direction: 'outbound',
                                timestamp: new Date(),
                            });
                            console.log('✅ Outbound template message saved to DB:', msgPayload.to);
                        } catch (err) {
                            console.error('❌ Failed to save outbound template message:', err);
                        }
                    } catch (err) {
                        console.error('❌ Failed to send outbound template message:', (err as Error)?.message || err, err);
                    }
                } else {
                    console.warn('⚠️ Twilio client not initialized, cannot send outbound template message.');
                }
            }
            // Match 'loan' in any case, as a whole word
            if (/\bloan\b/i.test(Body)) {
                console.log('Attempting to send template message in response to loan keyword');
                if (client) {
                    try {
                        // Log vendor name and contactNumber
                        try {
                            const possibleNumbers = [From.replace('whatsapp:', '')];
                            if (possibleNumbers[0].startsWith('+91')) possibleNumbers.push(possibleNumbers[0].replace('+91', '91'));
                            if (possibleNumbers[0].startsWith('+')) possibleNumbers.push(possibleNumbers[0].substring(1));
                            possibleNumbers.push(possibleNumbers[0].slice(-10));
                            // Try User collection first
                            const UserModel = (await import('../models/User.js')).User;
                            let user = await UserModel.findOne({ contactNumber: { $in: possibleNumbers } });
                            let name = null, contactNumber = null;
                            if (user) {
                                name = user.name;
                                contactNumber = user.contactNumber;
                            } else {
                                // Fallback to Vendor collection
                                const VendorModel = (await import('../models/Vendor.js')).default;
                                const vendor = await VendorModel.findOne({ contactNumber: { $in: possibleNumbers } });
                                if (vendor) {
                                    name = vendor.name;
                                    contactNumber = vendor.contactNumber;
                                }
                            }
                            if (name && contactNumber) {
                                // Prevent duplicate logs for same contactNumber in last 24h
                                const LoanReplyLog = (await import('../models/LoanReplyLog.js')).default;
                                const since = new Date(Date.now() - 24*60*60*1000);
                                const alreadyLogged = await LoanReplyLog.findOne({ contactNumber, timestamp: { $gte: since } });
                                if (!alreadyLogged) {
                                    await LoanReplyLog.create({ vendorName: name, contactNumber });
                                    console.log('✅ Logged loan reply for:', name, contactNumber);
                                } else {
                                    console.log('ℹ️ Already logged for loan reply in last 24h:', contactNumber);
                                }
                            } else {
                                console.log('No user or vendor found for contactNumber:', possibleNumbers);
                            }
                        } catch (err) {
                            console.error('❌ Failed to log loan reply:', err);
                        }
                        const msgPayload: any = {
                            from: `whatsapp:${To.replace('whatsapp:', '')}`,
                            to: From,
                            contentSid: 'HXcdbf14c73f068958f96efc216961834d',
                            contentVariables: JSON.stringify({})
                        };
                        if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                            msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                        }
                        const twilioResp = await client.messages.create(msgPayload);
                        console.log('✅ Triggered outbound template message HXcdbf14c73f068958f96efc216961834d in response to loan keyword. Twilio response:', twilioResp);
                        // Save the outbound template message to MongoDB for chat display
                        try {
                            await Message.create({
                                from: msgPayload.from,
                                to: msgPayload.to,
                                body: `Certainly! ✅\nज़रूर! ✅\n\nWe’re currently working on loan services specially designed for vendors like you.\nहम वेंडर्स के लिए खासतौर पर बनाई गई लोन सेवाओं पर काम कर रहे हैं।\n\nTo help you secure this opportunity, *are you willing to verify your Aadhaar information?*\nइस अवसर को सुरक्षित करने के लिए, *क्या आप अपनी आधार जानकारी सत्यापित करने के लिए तैयार हैं?*\n\nWe’ll notify you as soon as the loan support system is live.\nजैसे ही हमारी लोन सहायता सेवा शुरू होती है, हम आपको तुरंत सूचित करेंगे।\n\nDon’t worry — your interest is already saved with us! 🙌\nचिंता न करें — आपकी रुचि हमने सुरक्षित रख ली है! 🙌\n\nThanks for your patience! 💛\nआपके धैर्य के लिए धन्यवाद! 💛`,
                                direction: 'outbound',
                                timestamp: new Date(),
                            });
                            console.log('✅ Outbound loan template message saved to DB:', msgPayload.to);
                        } catch (err) {
                            console.error('❌ Failed to save outbound loan template message:', err);
                        }
                    } catch (err) {
                        console.error('❌ Failed to send outbound loan template message:', (err as Error)?.message || err, err);
                    }
                } else {
                    console.warn('⚠️ Twilio client not initialized, cannot send outbound loan template message.');
                }
            }
        }

        // Handle 'Get Loan Support' button reply
        const isLoanSupportButton = req.body.ButtonPayload === 'loan_support';
        if (isLoanSupportButton) {
            console.log("Received 'Get Loan Support' button reply.");
            try {
                // Log vendor name and contactNumber
                const phone = From.replace('whatsapp:', '');
                const possibleNumbers = [phone];
                if (phone.startsWith('+91')) possibleNumbers.push(phone.replace('+91', '91'));
                if (phone.startsWith('+')) possibleNumbers.push(phone.substring(1));
                possibleNumbers.push(phone.slice(-10));

                const user = await User.findOne({ contactNumber: { $in: possibleNumbers } });
                let name = null, contactNumber = null;
                if (user) {
                    name = user.name;
                    contactNumber = user.contactNumber;
                }

                if (name && contactNumber) {
                    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    const alreadyLogged = await LoanReplyLog.findOne({ contactNumber, timestamp: { $gte: since } });
                    if (!alreadyLogged) {
                        await LoanReplyLog.create({ vendorName: name, contactNumber });
                        console.log('✅ Logged loan support reply for:', name, contactNumber);
                    } else {
                        console.log('ℹ️ Already logged for loan support reply in last 24h:', contactNumber);
                    }
                } else {
                    console.log('No user found for contactNumber:', possibleNumbers);
                }
            } catch (err) {
                console.error('❌ Failed to log loan support reply:', err);
            }

            // Send the follow-up template message
            if (client) {
                try {
                    const msgPayload: any = {
                        from: `whatsapp:${To.replace('whatsapp:', '')}`,
                        to: From,
                        contentSid: 'HXcdbf14c73f068958f96efc216961834d',
                        contentVariables: JSON.stringify({})
                    };
                    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                        msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                    }
                    const twilioResp = await client.messages.create(msgPayload);
                    console.log('✅ Triggered outbound template message HXcdbf14c73f068958f96efc216961834d in response to loan_support button. Twilio response:', twilioResp);
                } catch (err) {
                    console.error('❌ Failed to send loan support follow-up template message:', (err as Error)?.message || err, err);
                }
            }
        }

        // Handle 'yes_support' button reply for support call tracking
        const isSupportButton = req.body.ButtonPayload === 'yes_support';
        if (isSupportButton) {
            console.log("Received 'yes_support' button reply.");
            try {
                const phone = From.replace('whatsapp:', '');
                const possibleNumbers = [phone];
                if (phone.startsWith('+91')) possibleNumbers.push(phone.replace('+91', '91'));
                if (phone.startsWith('+')) possibleNumbers.push(phone.substring(1));
                possibleNumbers.push(phone.slice(-10));

                // Find vendor name from User or Vendor
                let name = null, contactNumber = null;
                const user = await User.findOne({ contactNumber: { $in: possibleNumbers } });
                if (user) {
                    name = user.name;
                    contactNumber = user.contactNumber;
                } else {
                    const VendorModel = (await import('../models/Vendor.js')).default;
                    const vendor = await VendorModel.findOne({ contactNumber: { $in: possibleNumbers } });
                    if (vendor) {
                        name = vendor.name;
                        contactNumber = vendor.contactNumber;
                    }
                }
                if (name && contactNumber) {
                    // Prevent duplicate logs for same contactNumber in last 24h
                    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    const alreadyLogged = await SupportCallLog.findOne({ contactNumber, timestamp: { $gte: since } });
                    if (!alreadyLogged) {
                        await SupportCallLog.create({ vendorName: name, contactNumber });
                        console.log('✅ Logged support call reply for:', name, contactNumber);
                    } else {
                        console.log('ℹ️ Already logged for support call reply in last 24h:', contactNumber);
                    }
                } else {
                    console.log('No user or vendor found for contactNumber:', possibleNumbers);
                }
            } catch (err) {
                console.error('❌ Failed to log support call reply:', err);
            }
        }

        // Handle 'verify_aadhar' button reply
        const isAadhaarButton = req.body.ButtonPayload === 'verify_aadhar';
        if (isAadhaarButton) {
            console.log("Received 'verify_aadhar' button reply.");
            try {
                const phone = From.replace('whatsapp:', '');
                const possibleNumbers = [phone];
                if (phone.startsWith('+91')) possibleNumbers.push(phone.replace('+91', '91'));
                if (phone.startsWith('+')) possibleNumbers.push(phone.substring(1));
                possibleNumbers.push(phone.slice(-10));

                const updatedLog = await LoanReplyLog.findOneAndUpdate(
                    { contactNumber: { $in: possibleNumbers } },
                    { aadharVerified: true },
                    { new: true, sort: { timestamp: -1 } }
                );

                if (updatedLog) {
                    console.log(`✅ Marked Aadhaar as verified for: ${updatedLog.contactNumber}`);
                } else {
                    console.log('No matching loan reply log found to update for Aadhaar verification.');
                }
            } catch (err) {
                console.error('❌ Failed to update loan reply log for Aadhaar verification:', err);
            }
        }

        // Upsert contact in contacts collection
        const phone = From.replace('whatsapp:', ''); // Remove whatsapp: prefix if present
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

        // After saving the inbound message, check for Aadhaar verification button reply
        // Twilio interactive replies may come as payload or in the Body
        // Check for button reply with ID 'verify_aadhar' or body indicating Aadhaar verification
        const isAadhaarButtonReply = (typeof Body === 'string' && (
            Body.trim().toLowerCase() === 'yes, i will verify aadhar' ||
            Body.trim().toLowerCase() === 'yes i will verify aadhar' ||
            Body.trim().toLowerCase().includes('verify_aadhar')
        )) || (req.body.ButtonPayload && req.body.ButtonPayload === 'verify_aadhar');

        if (isAadhaarButtonReply && client) {
            try {
                const msgPayload: any = {
                    from: `whatsapp:${To.replace('whatsapp:', '')}`,
                    to: From,
                    contentSid: 'HX1a44edbb684afc1a8213054a4731e53d',
                    contentVariables: JSON.stringify({})
                };
                if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                    msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                }
                const twilioResp = await client.messages.create(msgPayload);
                console.log('✅ Triggered Aadhaar verification template message HX1a44edbb684afc1a8213054a4731e53d. Twilio response:', twilioResp);
                // Optionally, save the outbound message to MongoDB for chat display
                try {
                    await Message.create({
                        from: msgPayload.from,
                        to: msgPayload.to,
                        body: '[Aadhaar verification template sent]',
                        direction: 'outbound',
                        timestamp: new Date(),
                    });
                    console.log('✅ Outbound Aadhaar verification template message saved to DB:', msgPayload.to);
                } catch (err) {
                    console.error('❌ Failed to save outbound Aadhaar verification template message:', err);
                }
            } catch (err) {
                console.error('❌ Failed to send Aadhaar verification template message:', (err as Error)?.message || err, err);
            }
        }

        // Return 200 OK to Twilio
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing webhook:', (error as Error)?.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add endpoint to fetch all loan reply logs
router.get('/loan-replies', async (_req, res) => {
  try {
    const logs = await LoanReplyLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch loan reply logs' });
  }
});

// Add endpoint to fetch support call requests in the last 24 hours
router.get('/support-calls', async (_req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Find logs where the reply was for support (id yes_support) in the last 24 hours
    // Assuming LoanReplyLog is also used for support replies, and we distinguish by a field or message type
    // If not, you may need to add a type field to LoanReplyLog. For now, filter by timestamp only.
    const logs = await SupportCallLog.find({
      timestamp: { $gte: since }
    }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch support call requests' });
  }
});

// PATCH endpoint to mark a support call as completed
router.patch('/support-calls/:id/complete', async (req: Request, res: Response) => {
    try {
        if (!['admin', 'onground', 'super_admin'].includes(req.user?.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const { id } = req.params;
        const updated = await SupportCallLog.findByIdAndUpdate(
            id,
            {
                completed: true,
                completedBy: req.user.username,
                completedAt: new Date(),
            },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'Support call log not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark support call as completed' });
    }
});

export default router;