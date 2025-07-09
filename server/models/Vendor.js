import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
  mobile_verified: {type: Boolean, default: false},
  mapsLink: { type: String },
  operatingHours: {
    openTime: { type: String, required: true },
    closeTime: { type: String, required: true },
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  updatedAt: { type: Date, default: Date.now },
});

vendorSchema.index({ location: '2dsphere' });

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor; 