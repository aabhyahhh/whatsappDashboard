import mongoose from 'mongoose';

const loanReplyLogSchema = new mongoose.Schema({
  vendorName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const LoanReplyLog = mongoose.model('LoanReplyLog', loanReplyLogSchema);
export default LoanReplyLog; 