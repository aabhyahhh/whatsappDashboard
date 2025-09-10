import mongoose from 'mongoose';

const dispatchLogSchema = new mongoose.Schema({
  vendorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { 
    type: String, 
    required: true 
  }, // Format: YYYY-MM-DD
  type: { 
    type: String, 
    enum: ['preOpen', 'open'], 
    required: true 
  },
  sentAt: { 
    type: Date, 
    default: Date.now 
  },
  messageId: { 
    type: String 
  },
  success: { 
    type: Boolean, 
    default: true 
  },
  error: { 
    type: String 
  }
}, {
  timestamps: true
});

// Unique compound index to prevent duplicates
dispatchLogSchema.index({ vendorId: 1, date: 1, type: 1 }, { unique: true });

// Index for efficient querying
dispatchLogSchema.index({ date: 1, type: 1 });
dispatchLogSchema.index({ vendorId: 1, sentAt: -1 });

const DispatchLog = mongoose.models.DispatchLog || mongoose.model('DispatchLog', dispatchLogSchema);

export { DispatchLog };
export default DispatchLog;
