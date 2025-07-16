import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

// Import models
import LoanReplyLog from '../server/models/LoanReplyLog.js';
import { Message } from '../server/models/Message.js';
import { User } from '../server/models/User.js';
import Vendor from '../server/models/Vendor.js';

async function getNameAndContactNumber(from: string) {
  const phone = from.replace(/^whatsapp:/, '');
  const possibleNumbers = [phone];
  if (phone.startsWith('+91')) possibleNumbers.push(phone.replace('+91', '91'));
  if (phone.startsWith('+')) possibleNumbers.push(phone.substring(1));
  possibleNumbers.push(phone.slice(-10));

  let user = await User.findOne({ contactNumber: { $in: possibleNumbers } });
  if (user) return { name: user.name, contactNumber: user.contactNumber };
  let vendor = await Vendor.findOne({ contactNumber: { $in: possibleNumbers } });
  if (vendor) return { name: vendor.name, contactNumber: vendor.contactNumber };
  return { name: '', contactNumber: phone };
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const messages = await Message.find({
    direction: 'inbound',
    body: 'Get Loan Support'
  }).sort({ timestamp: -1 });
  let count = 0;
  for (const msg of messages) {
    const { name, contactNumber } = await getNameAndContactNumber(msg.from);
    // Check if already logged for this contactNumber and timestamp
    const exists = await LoanReplyLog.findOne({ contactNumber, timestamp: msg.timestamp });
    if (!exists) {
      await LoanReplyLog.create({ vendorName: name, contactNumber, timestamp: msg.timestamp });
      count++;
      console.log(`Logged: ${name} (${contactNumber}) at ${msg.timestamp}`);
    } else {
      console.log(`Already logged: ${contactNumber} at ${msg.timestamp}`);
    }
  }
  console.log(`Backfill complete. ${count} new logs added.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 