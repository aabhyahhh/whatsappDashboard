import { Router } from 'express';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { client } from '../twilio.js';
import { User } from '../models/User.js';
const router = Router();
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
// Helper function to extract coordinates from Google Maps URL
function extractCoordinatesFromGoogleMaps(url) {
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
    }
    catch (error) {
        console.error('Error extracting coordinates from Google Maps URL:', error?.message);
        return null;
    }
}
// Helper function to extract coordinates from WhatsApp location sharing
function extractCoordinatesFromWhatsAppLocation(body) {
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
            /(-?\d+\.\d+),\s*(-?\d+\.\d+)/, // lat, lng
            /lat[itude]*:\s*(-?\d+\.\d+).*?lng[itude]*:\s*(-?\d+\.\d+)/i, // lat: x, lng: y
            /coordinates?:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/i, // coordinates: lat, lng
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
    }
    catch (error) {
        console.error('Error extracting coordinates from WhatsApp location:', error?.message);
        return null;
    }
}
// Helper function to check if message contains location data
function extractLocationFromMessage(body) {
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
router.post('/', async (req, res) => {
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
        let location = null;
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
        const messageData = {
            from: From,
            to: To,
            body: Body || '[location message]', // Use a placeholder if Body is empty
            direction: 'inbound',
            timestamp: new Date(),
        };
        // Always add location, address, and label if extracted
        if (location) {
            messageData.location = location;
            if (address)
                messageData.address = address;
            if (label)
                messageData.label = label;
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
                if (phone.startsWith('+91'))
                    userNumbers.push(phone.replace('+91', '91'));
                if (phone.startsWith('+'))
                    userNumbers.push(phone.substring(1));
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
            }
            catch (err) {
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
                        const msgPayload = {
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
                        }
                        catch (err) {
                            console.error('❌ Failed to save outbound template message:', err);
                        }
                    }
                    catch (err) {
                        console.error('❌ Failed to send outbound template message:', err?.message || err, err);
                    }
                }
                else {
                    console.warn('⚠️ Twilio client not initialized, cannot send outbound template message.');
                }
            }
        }
        
        // Handle loan keyword
        if (hasBody && typeof Body === 'string' && /\bloan\b/i.test(Body)) {
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
                    const VendorModel = (await import('../models/Vendor.js')).default;
                    const vendor = await VendorModel.findOne({ contactNumber: { $in: userNumbers } });
                    if (vendor && vendor.name) {
                        vendorName = vendor.name;
                    }
                }
                
                // Check if already logged for this contactNumber and timestamp (within 1 minute)
                const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
                const LoanReplyLogModel = (await import('../models/LoanReplyLog.js')).default;
                const existingLog = await LoanReplyLogModel.findOne({
                    contactNumber: phone,
                    timestamp: { $gte: oneMinuteAgo }
                });
                
                if (!existingLog) {
                    await LoanReplyLogModel.create({
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
            
            // Send loan template message
            if (client) {
                try {
                    const msgPayload = {
                        from: `whatsapp:${To.replace('whatsapp:', '')}`,
                        to: From,
                        contentSid: 'HXcdbf14c73f068958f96efc216961834d',
                        contentVariables: JSON.stringify({})
                    };
                    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                        msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                    }
                    const twilioResp = await client.messages.create(msgPayload);
                    console.log('✅ Triggered loan template message. Twilio response:', twilioResp);
                } catch (err) {
                    console.error('❌ Failed to send loan template message:', err?.message || err);
                }
            }
        }
        
        // Upsert contact in contacts collection
        const phone = From.replace('whatsapp:', ''); // Remove whatsapp: prefix if present
        await Contact.findOneAndUpdate({ phone: phone }, {
            phone: phone,
            lastSeen: new Date(),
            updatedAt: new Date()
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        });
        console.log('✅ Upserted contact:', { phone, lastSeen: new Date() });
        // Return 200 OK to Twilio
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Error processing webhook:', error?.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
