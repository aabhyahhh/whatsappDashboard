import { Document } from 'mongoose';

export interface IVendorLocation extends Document {
  phone: string;
  location: {
    lat: number;
    lng: number;
  };
  updatedAt: Date;
}

declare const VendorLocation: any;
export default VendorLocation;
