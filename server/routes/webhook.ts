import { Router, Request, Response } from 'express';
import { Message } from '../models/Message';
import { Contact } from '../models/Contact';

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
        console.error('Error extracting coordinates from Google Maps URL:', error);
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
        console.error('Error extracting coordinates from WhatsApp location:', error);
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
        const { From, Body, To } = req.body;

        // Basic validation
        if (!From || !Body || !To) {
            console.error('Missing required fields in webhook payload:', req.body);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Only save as inbound if From is NOT your Twilio number
        if (From.replace('whatsapp:', '') === twilioNumber.replace('whatsapp:', '')) {
            console.log('Skipping saving message from own Twilio number as inbound.');
            return res.status(200).send('OK');
        }

        // Extract location data if present
        const location = extractLocationFromMessage(Body);

        // Create new message document
        const messageData: any = {
            from: From,
            to: To,
            body: Body,
            direction: 'inbound',
            timestamp: new Date(),
        };

        // Add location data if extracted
        if (location) {
            messageData.location = location;
        }

        const message = new Message(messageData);

        // Save message to MongoDB
        await message.save();
        
        console.log('✅ Saved inbound message:', {
            from: message.from,
            to: message.to,
            body: message.body.substring(0, 50) + (message.body.length > 50 ? '...' : ''),
            timestamp: message.timestamp,
            location: message.location && message.location.latitude && message.location.longitude ? '📍 Location included' : 'No location',
        });

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
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router; 