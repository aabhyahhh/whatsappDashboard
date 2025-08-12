import mongoose from 'mongoose';

const supportCallReminderLogSchema = new mongoose.Schema({
  contactNumber: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
});

const SupportCallReminderLog = mongoose.models.SupportCallReminderLog || mongoose.model('SupportCallReminderLog', supportCallReminderLogSchema);
export default SupportCallReminderLog; 