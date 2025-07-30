import mongoose from 'mongoose';

const supportCallLogSchema = new mongoose.Schema({
  vendorName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  completed: { type: Boolean, default: false },
  completedBy: { type: String }, // user/admin who marked as completed
  completedAt: { type: Date },    // when marked as completed
});

const SupportCallLog = mongoose.model('SupportCallLog', supportCallLogSchema);
export default SupportCallLog; 