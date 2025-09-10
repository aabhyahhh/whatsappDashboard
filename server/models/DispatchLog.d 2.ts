import { Document } from 'mongoose';

export interface DispatchLog extends Document {
  vendorId: string;
  date: string; // Format: YYYY-MM-DD
  type: 'preOpen' | 'open';
  sentAt: Date;
  messageId?: string;
  success: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
