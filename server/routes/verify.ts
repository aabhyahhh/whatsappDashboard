import { Router } from 'express';
import type { RequestHandler } from 'express';
import Verification from '../models/Verification.js';
import { client } from '../twilio.js'; // adjust import if needed

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

  // Check if Twilio client is available
  if (!client) {
    console.log(`📱 OTP for ${phone}: ${otp} (Twilio not configured)`);
    res.json({ success: true, message: 'OTP sent (development mode)', otp });
    return;
  }

  try {
    console.log('Attempting to send OTP to:', phone); // Logging before Twilio call
    // Use WhatsApp template for OTP
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER!}`,
      to: `whatsapp:${phone}`,
      contentSid: 'HX53634524df0195b948e15de6fd0c602c', // Your template SID
      contentVariables: JSON.stringify({ '1': otp }), // Assuming your template uses {{1}} for OTP
    });

    res.json({ success: true, message: 'OTP sent' });
  } catch (err: any) {
    console.error('Twilio error:', err); // Detailed error logging
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
