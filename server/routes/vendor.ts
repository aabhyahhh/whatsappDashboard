import express from 'express';
import type { Request, Response } from 'express';
// @ts-ignore
import { User } from '../models/User.js';
// @ts-ignore
import { checkAndSendReminders } from '../vendorRemindersCron.js';

const router = express.Router();

// GET /api/vendor/check-vendor-reminders
router.get('/check-vendor-reminders', async (_req: Request, res: Response) => {
  try {
    await checkAndSendReminders();
    res.send('Reminder check complete');
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vendor/update-location
router.post('/update-location', async (req: Request, res: Response) => {
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
    // If neither mapsLink nor coordinates are provided, just update other fields if any
    if (!mapsLink && !latitude && !longitude) {
      return res.status(400).json({ error: 'Nothing to update: provide at least one of mapsLink, lat, or lng' });
    }
    // Build update object
    const updateObj: any = { updatedAt: new Date() };
    if (mapsLink) updateObj.mapsLink = mapsLink;
    if (latitude && longitude) {
      updateObj.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }
    const vendor = await User.findOneAndUpdate(
      { contactNumber },
      updateObj,
      { new: true }
    );
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ success: true, vendor });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor - Get all vendors (now users)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor/open-count - Get count of open vendors (now users)
router.get('/open-count', async (_req: Request, res: Response) => {
  try {
    const users = await User.find({});
    function isOpenNow(user: any): boolean {
      if (!user.operatingHours || !user.operatingHours.openTime || !user.operatingHours.closeTime || !user.operatingHours.days) {
        return false;
      }
      const now = new Date();
      const day = now.getDay();
      const yesterday = (day + 6) % 7;
      function parseTime(str: string): number {
        const [time, period] = str.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      }
      const openMinutes = parseTime(user.operatingHours.openTime);
      const closeMinutes = parseTime(user.operatingHours.closeTime);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const daysArr = user.operatingHours.days;
      let result;
      if (openMinutes < closeMinutes) {
        result = daysArr.includes(day) && nowMinutes >= openMinutes && nowMinutes < closeMinutes;
      } else {
        if (nowMinutes >= openMinutes) {
          result = daysArr.includes(day);
        } else if (nowMinutes < closeMinutes) {
          result = daysArr.includes(yesterday);
        } else {
          result = false;
        }
      }
      return result;
    }
    const openCount = users.filter(isOpenNow).length;
    res.json({ count: openCount });
  } catch (err) {
    console.error('Error counting open vendors:', err);
    res.status(500).json({ error: 'Failed to count open vendors' });
  }
});

export default router; 