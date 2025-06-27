import express from 'express';
const router = express.Router();
import moment from 'moment-timezone';
import twilio from 'twilio';
import Vendor from '../models/Vendor.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { client } from '../twilio.js';

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH;
const client = twilio(accountSid, authToken);

// HOW TO SETUP NODE-CRON FOR THIS USE CASE:
// 1. Install node-cron: npm install node-cron
// 2. This file will schedule WhatsApp reminders for all users based on their openTime.
// 3. The cron job runs every minute, checks all users, and sends reminders as needed.
// 4. Make sure this file is imported and executed in your main server entry (e.g., server.js or app.js).

const cron = require('node-cron');

// Template SID for the reminder message
const TEMPLATE_SID = 'HXa36006480cdbfe35897764a05983bc77';

// Helper: Check if a location was received from user today
async function hasLocationToday(contactNumber) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const messages = await Message.find({
    from: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    'location.latitude': { $exists: true },
    timestamp: { $gte: since }
  });
  return messages.length > 0;
}

// Helper: Check if a reminder was sent today
async function hasReminderSentToday(contactNumber, minutesBefore) {
  const since = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const bodyRegex = new RegExp(TEMPLATE_SID, 'i');
  const messages = await Message.find({
    to: { $in: [contactNumber, `whatsapp:${contactNumber}`] },
    body: { $regex: bodyRegex },
    timestamp: { $gte: since },
    'meta.minutesBefore': minutesBefore
  });
  return messages.length > 0;
}

// Schedule the cron job to run every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = moment().tz('Asia/Kolkata');
    const users = await User.find({ whatsappConsent: true });
    for (const user of users) {
      if (!user.operatingHours || !user.operatingHours.openTime) continue;
      const openTime = moment.tz(user.operatingHours.openTime, 'h:mm A', 'Asia/Kolkata');
      openTime.set({
        year: now.year(),
        month: now.month(),
        date: now.date(),
      });
      const diff = openTime.diff(now, 'minutes');
      // 30 minutes before openTime
      if (diff === 30) {
        if (!(await hasReminderSentToday(user.contactNumber, 30))) {
          await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${user.contactNumber}`,
            contentSid: TEMPLATE_SID,
            contentVariables: JSON.stringify({}),
          });
          await Message.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.contactNumber,
            body: TEMPLATE_SID,
            direction: 'outbound',
            timestamp: new Date(),
            meta: { minutesBefore: 30 }
          });
          console.log(`Sent 30-min reminder to ${user.contactNumber}`);
        }
      }
      // 15 minutes before openTime, if no location received
      if (diff === 15) {
        if (!(await hasLocationToday(user.contactNumber)) && !(await hasReminderSentToday(user.contactNumber, 15))) {
          await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${user.contactNumber}`,
            contentSid: TEMPLATE_SID,
            contentVariables: JSON.stringify({}),
          });
          await Message.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.contactNumber,
            body: TEMPLATE_SID,
            direction: 'outbound',
            timestamp: new Date(),
            meta: { minutesBefore: 15 }
          });
          console.log(`Sent 15-min reminder to ${user.contactNumber}`);
        }
      }
    }
  } catch (err) {
    console.error('Error in WhatsApp reminder cron job:', err);
  }
});

// GET /api/vendor/check-vendor-reminders
router.get('/check-vendor-reminders', async (req, res) => {
  try {
    const now = moment().tz('Asia/Kolkata');
    const startOfToday = now.clone().startOf('day');

    // Find vendors who have not received a reminder today
    const vendors = await Vendor.find({
      $or: [
        { lastReminderSentAt: { $exists: false } },
        { lastReminderSentAt: null },
        { lastReminderSentAt: { $lt: startOfToday.toDate() } },
      ],
    });

    for (let vendor of vendors) {
      if (!vendor.operatingHours?.openTime) continue;
      const openTime = moment.tz(vendor.operatingHours.openTime, 'h:mm A', 'Asia/Kolkata');
      const timeDiff = openTime.diff(now, 'minutes');
      if (timeDiff >= 29 && timeDiff <= 31) {
        const reminderBody = `🌞 नमस्ते ${vendor.name}! \nआपकी लारी ${vendor.operatingHours.openTime} बजे खुलती है।\n\nकृपया नीचे 'लोकेशन भेजें' बटन से अपनी लाइव लोकेशन शेयर करें ताकि ग्राहक आपको खोज सकें।\n\n👉 जैसे ही आप लोकेशन भेजेंगे, हम इसे नक्शे पर अपडेट कर देंगे।`;
        await client.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP}`,
          to: `whatsapp:${vendor.contactNumber}`,
          body: reminderBody,
          persistentAction: ['geo:0,0?q=Send+your+location'],
        });
        // Save outbound message to MongoDB
        await Message.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP}`,
          to: `whatsapp:${vendor.contactNumber}`,
          body: reminderBody,
          direction: 'outbound',
          timestamp: new Date(),
        });
        // Update the last reminder sent time to now
        vendor.lastReminderSentAt = now.toDate();
        await vendor.save();
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
      const match = mapsLink.match(/@([-\.\d]+),([-\.\d]+)/);
      if (match) {
        latitude = match[1];
        longitude = match[2];
      } else {
        // Try to extract from ?q=lat,lng
        const qMatch = mapsLink.match(/[?&]q=([-\.\d]+),([-\.\d]+)/);
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
    if (mapsLink) updateObj.mapsLink = mapsLink;
    if (latitude && longitude) {
      updateObj.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }
    const vendor = await Vendor.findOneAndUpdate(
      { contactNumber },
      updateObj,
      { new: true }
    );
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ success: true, vendor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor - Get all vendors
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.find({});
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 