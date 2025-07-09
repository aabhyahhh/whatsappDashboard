import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

async function main() {
  await mongoose.connect(MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const result = await User.updateMany(
    { $or: [ { addedBy: { $exists: false } }, { addedBy: null }, { addedBy: '' }, { addedBy: 'System' } ] },
    { $set: { addedBy: 'admin' } }
  );
  console.log(`Updated ${result.modifiedCount || result.nModified} users with addedBy = 'admin'`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 