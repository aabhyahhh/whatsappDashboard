import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  otp: String,
  isVerified: { type: Boolean, default: false },
  expiresAt: Date,
});

export default mongoose.model('Verification', verificationSchema);
