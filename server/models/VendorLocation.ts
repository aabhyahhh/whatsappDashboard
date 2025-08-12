import mongoose, { Document } from 'mongoose';

export interface IVendorLocation extends Document {
  phone: string;
  location: {
    lat: number;
    lng: number;
  };
  updatedAt: Date;
}

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

export const VendorLocation = mongoose.model<IVendorLocation>('VendorLocation', vendorLocationSchema);
export default VendorLocation;
