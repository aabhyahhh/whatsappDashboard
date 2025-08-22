import express from 'express';
// @ts-ignore
import Vendor from '../models/Vendor.js';
// @ts-ignore
import { checkAndSendReminders } from '../vendorRemindersCron.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { client } from '../twilio.js';
const router = express.Router();
// GET /api/vendor/check-vendor-reminders
router.get('/check-vendor-reminders', async (_req, res) => {
    try {
        await checkAndSendReminders();
        res.send('Reminder check complete');
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/vendor/send-profile-photo-announcement
router.post('/send-profile-photo-announcement', async (req, res) => {
    try {
        const { force = false } = req.body;
        
        console.log('🚀 Starting profile photo feature announcement...');
        console.log(`📅 Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        
        // Find all users with WhatsApp consent
        const users = await User.find({ whatsappConsent: true });
        console.log(`📊 Found ${users.length} users with WhatsApp consent.`);
        
        let sent = 0;
        let failed = 0;
        let skipped = 0;
        
        for (const user of users) {
            const contact = user.contactNumber;
            
            // Skip users without valid contact numbers
            if (!contact || typeof contact !== 'string' || contact.length < 10) {
                console.warn(`⚠️ Skipping user ${user._id} - invalid contact number: ${contact}`);
                skipped++;
                continue;
            }
            
            // Check if message was already sent today to this user (unless force is true)
            if (!force) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                const existingMessage = await Message.findOne({
                    to: contact,
                    body: 'HX5364d2f0c0cce7ac9e38673572a45d15', // Template ID
                    timestamp: { $gte: today, $lt: tomorrow }
                });
                
                if (existingMessage) {
                    console.log(`⏩ Skipping ${contact} - message already sent today`);
                    skipped++;
                    continue;
                }
            }
            
            try {
                // Send WhatsApp message
                await client.messages.create({
                    from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                    to: `whatsapp:${contact}`,
                    contentSid: 'HX5364d2f0c0cce7ac9e38673572a45d15', // Template ID
                    contentVariables: JSON.stringify({}),
                });
                
                // Save message to database
                await Message.create({
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: contact,
                    body: 'HX5364d2f0c0cce7ac9e38673572a45d15',
                    direction: 'outbound',
                    timestamp: new Date(),
                    meta: { 
                        campaign: 'profile-photo-announcement',
                        date: new Date().toISOString().split('T')[0]
                    }
                });
                
                sent++;
                console.log(`✅ Sent profile photo announcement to ${contact} (${user.name || 'Unknown'})`);
                
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (err) {
                failed++;
                console.error(`❌ Failed to send to ${contact}:`, err.message || err);
            }
        }
        
        const summary = {
            success: true,
            sent,
            failed,
            skipped,
            total: sent + failed + skipped,
            message: 'Profile photo announcement campaign completed'
        };
        
        console.log('\n📈 Summary:', summary);
        res.json(summary);
        
    } catch (err) {
        console.error('💥 Error in profile photo announcement:', err);
        res.status(500).json({ error: err.message });
    }
});
// POST /api/vendor/update-location
router.post('/update-location', async (req, res) => {
    try {
        const { contactNumber, mapsLink, lat, lng } = req.body;
        if (!contactNumber) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        let latitude = lat, longitude = lng;
        // If lat/lng not provided, try to extract from mapsLink
        if ((!latitude || !longitude) && mapsLink) {
            // Try to extract from Google Maps link
            const match = mapsLink.match(/@([-.\d]+),([-.\d]+)/);
            if (match) {
                latitude = match[1];
                longitude = match[2];
            }
            else {
                // Try to extract from ?q=lat,lng
                const qMatch = mapsLink.match(/[?&]q=([-.\d]+),([-.\d]+)/);
                if (qMatch) {
                    latitude = qMatch[1];
                    longitude = qMatch[2];
                }
            }
        }
        // If neither mapsLink nor coordinates are provided, just update other fields if any
        if (!mapsLink && !latitude && !longitude) {
            return res.status(400).json({ error: 'Nothing to update: provide at least one of mapsLink, lat, or lng' });
        }
        // Build update object
        const updateObj = { updatedAt: new Date() };
        if (mapsLink)
            updateObj.mapsLink = mapsLink;
        if (latitude && longitude) {
            updateObj.location = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
            };
        }
        const vendor = await Vendor.findOneAndUpdate({ contactNumber }, updateObj, { new: true });
        if (!vendor)
            return res.status(404).json({ error: 'Vendor not found' });
        res.json({ success: true, vendor });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/vendor - Get all vendors
router.get('/', async (_req, res) => {
    try {
        const vendors = await Vendor.find({});
        res.json(vendors);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/vendor/open-count - Get count of open vendors right now
router.get('/open-count', async (_req, res) => {
    try {
        const vendors = await Vendor.find({});
        // Helper to check if a vendor is open now
        function isOpenNow(vendor) {
            if (!vendor.operatingHours || !vendor.operatingHours.openTime || !vendor.operatingHours.closeTime || !vendor.operatingHours.days) {
                return false;
            }
            const now = new Date();
            const day = now.getDay(); // 0=Sunday, 6=Saturday
            const yesterday = (day + 6) % 7;
            function parseTime(str) {
                const [time, period] = str.split(' ');
                let [h, m] = time.split(':').map(Number);
                if (period === 'PM' && h !== 12)
                    h += 12;
                if (period === 'AM' && h === 12)
                    h = 0;
                return h * 60 + m;
            }
            const openMinutes = parseTime(vendor.operatingHours.openTime);
            const closeMinutes = parseTime(vendor.operatingHours.closeTime);
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const daysArr = vendor.operatingHours.days;
            let result;
            if (openMinutes < closeMinutes) {
                result = daysArr.includes(day) && nowMinutes >= openMinutes && nowMinutes < closeMinutes;
            }
            else {
                if (nowMinutes >= openMinutes) {
                    result = daysArr.includes(day);
                }
                else if (nowMinutes < closeMinutes) {
                    result = daysArr.includes(yesterday);
                }
                else {
                    result = false;
                }
            }
            return result;
        }
        const openCount = vendors.filter(isOpenNow).length;
        res.json({ count: openCount });
    }
    catch (err) {
        console.error('Error counting open vendors:', err);
        res.status(500).json({ error: 'Failed to count open vendors' });
    }
});
export default router;
