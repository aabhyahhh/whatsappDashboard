import mongoose from 'mongoose';

const loanReplyLogSchema = new mongoose.Schema({
  vendorName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  aadharVerified: { type: Boolean, default: false }
});

const LoanReplyLog = mongoose.models.LoanReplyLog || mongoose.model('LoanReplyLog', loanReplyLogSchema);
export default LoanReplyLog; 