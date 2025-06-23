import express from 'express';
const router = express.Router();
import moment from 'moment-timezone';
import twilio from 'twilio';
import Vendor from '../models/Vendor.js';

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH;
const client = twilio(accountSid, authToken);

// GET /api/vendor/check-vendor-reminders
router.get('/check-vendor-reminders', async (req, res) => {
  try {
    const now = moment().tz('Asia/Kolkata');
    const vendors = await Vendor.find();
    for (let vendor of vendors) {
      if (!vendor.operatingHours?.openTime) continue;
      const openTime = moment.tz(vendor.operatingHours.openTime, 'h:mm A', 'Asia/Kolkata');
      const timeDiff = openTime.diff(now, 'minutes');
      if (timeDiff >= 29 && timeDiff <= 31) {
        await client.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP}`,
          to: `whatsapp:${vendor.contactNumber}`,
          body: `🌞 नमस्ते ${vendor.name}! \nआपकी लारी ${vendor.operatingHours.openTime} बजे खुलती है।\n\nकृपया नीचे 'लोकेशन भेजें' बटन से अपनी लाइव लोकेशन शेयर करें ताकि ग्राहक आपको खोज सकें।\n\n👉 जैसे ही आप लोकेशन भेजेंगे, हम इसे नक्शे पर अपडेट कर देंगे।`,
          persistentAction: ['geo:0,0?q=Send+your+location'],
        });
      }
    }
    res.send('Reminder check complete');
  } catch (err) {
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
      } else {
        // Try to extract from ?q=lat,lng
        const qMatch = mapsLink.match(/[?&]q=([-.\d]+),([-.\d]+)/);
        if (qMatch) {
          latitude = qMatch[1];
          longitude = qMatch[2];
        }
      }
    }
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Missing or invalid coordinates' });
    }
    const vendor = await Vendor.findOneAndUpdate(
      { contactNumber },
      {
        mapsLink,
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        updatedAt: new Date(),
      },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ success: true, vendor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 