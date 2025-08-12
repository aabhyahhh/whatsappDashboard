import mongoose, { Schema } from 'mongoose';

const vendorLocationSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
vendorLocationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes
vendorLocationSchema.index({ phone: 1 });
vendorLocationSchema.index({ updatedAt: -1 });

vendorLocationSchema.on('index', function(err) {
  if (err) {
    console.error('Error creating VendorLocation indexes:', err);
  } else {
    console.log('VendorLocation model indexes created successfully');
  }
});

const VendorLocation = mongoose.models.VendorLocation || mongoose.model('VendorLocation', vendorLocationSchema);

export default VendorLocation;
