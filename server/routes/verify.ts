import { Router } from 'express';
import type { RequestHandler } from 'express';
import Verification from '../models/Verification.js';
import { sendTextMessage } from '../meta.js';

const router = Router();

const requestOTP: RequestHandler = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    res.status(400).json({ error: 'Phone is required' });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await Verification.findOneAndUpdate(
    { phone },
    { otp, expiresAt: expires, isVerified: false },
    { upsert: true }
  );

  // Check if Meta WhatsApp API credentials are available
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.log(`📱 OTP for ${phone}: ${otp} (Meta WhatsApp API not configured)`);
    res.json({ success: true, message: 'OTP sent (development mode)', otp });
    return;
  }

  try {
    console.log('Attempting to send OTP to:', phone);
    
    // Send OTP via Meta WhatsApp API
    const otpMessage = `Your Laari Khojo verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.`;
    
    await sendTextMessage(phone, otpMessage);

    res.json({ success: true, message: 'OTP sent' });
  } catch (err: any) {
    console.error('Meta WhatsApp API error:', err);
    res.status(500).json({ success: false, error: err.message, details: err });
  }
};

const verifyOTP: RequestHandler = async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    res.status(400).json({ error: 'Phone and OTP are required' });
    return;
  }

  try {
    const verification = await Verification.findOne({ phone });

    if (!verification) {
      res.status(404).json({ error: 'No OTP request found for this phone number' });
      return;
    }

    if (verification.isVerified) {
      res.json({ success: true, message: 'Phone number already verified' });
      return;
    }

    if (!verification.expiresAt || verification.expiresAt < new Date()) {
      res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      return;
    }

    if (verification.otp !== otp) {
      res.status(400).json({ error: 'Invalid OTP' });
      return;
    }

    // Mark as verified
    verification.isVerified = true;
    await verification.save();

    res.json({ success: true, message: 'Phone number verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.post('/request', requestOTP);
router.post('/verify', verifyOTP);

export default router;
