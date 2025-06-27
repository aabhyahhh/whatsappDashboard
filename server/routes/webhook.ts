import { Router } from 'express';
import type { Request, Response } from 'express';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { client } from '../twilio.js';

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

        // Extract location data if present in Body (existing logic)
        let location: { latitude: number; longitude: number } | null = null;
        let address = undefined;
        let label = undefined;

        if (hasBody) {
            location = extractLocationFromMessage(Body);
        }

        // If not found in Body, check for native WhatsApp location fields from Twilio
        if (!location && hasCoordinates) {
            const lat = parseFloat(Latitude);
            const lng = parseFloat(Longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                location = { latitude: lat, longitude: lng };
                address = Address;
                label = Label;
                console.log('📍 Extracted coordinates from Twilio location fields:', location);
            }
        }

        // Create new message document
        const messageData: any = {
            from: From,
            to: To,
            body: Body || '', // Ensure body is never undefined
            direction: 'inbound',
            timestamp: new Date(),
        };

        // Add location, address, and label if extracted
        if (location) {
            messageData.location = location;
            if (address) messageData.address = address;
            if (label) messageData.label = label;
        }

        const message = new Message(messageData);

        // Save message to MongoDB
        await message.save();
        
        console.log('✅ Saved inbound message:', {
            from: message.from,
            to: message.to,
            body: message.body.length > 0 ? message.body.substring(0, 50) + (message.body.length > 50 ? '...' : '') : '[Empty body - location message]',
            timestamp: message.timestamp,
            location: message.location && message.location.latitude && message.location.longitude ? '📍 Location included' : 'No location',
            address: message.get('address') || undefined,
            label: message.get('label') || undefined,
        });

        // If the inbound message is exactly 'hi' (case-insensitive), send the template message
        if (hasBody && typeof Body === 'string' && Body.trim().toLowerCase() === 'hi') {
            console.log('Attempting to send template message in response to "hi"');
            if (client) {
                try {
                    const msgPayload: any = {
                        from: `whatsapp:${To.replace('whatsapp:', '')}`,
                        to: From,
                        contentSid: 'HX55104a6392c8cc079970a6116671ec51',
                        contentVariables: JSON.stringify({})
                    };
                    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                        msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                    }
                    const twilioResp = await client.messages.create(msgPayload);
                    console.log('✅ Triggered outbound template message HX55104a6392c8cc079970a6116671ec51 in response to "hi". Twilio response:', twilioResp);

                    // Save the outbound template message to MongoDB for chat display
                    try {
                        await Message.create({
                            from: msgPayload.from,
                            to: msgPayload.to,
                            body: "Namaste from Laari Khojo!\n\nThanks for reaching out!\nWe help you get discovered by more customers by showing your live location and updates on our platform.\n\nTo get started, please reply with:\n📍 Your current location – so we can mark you active for today.\n\nLet's grow your laari together! 🚀",
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

        // Return 200 OK to Twilio
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing webhook:', (error as Error)?.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;