import { Model, Document } from 'mongoose';

export interface ILoanReplyLog extends Document {
  vendorName: string;
  contactNumber: string;
  timestamp: Date;
}

declare const LoanReplyLog: Model<ILoanReplyLog>;
export default LoanReplyLog; 