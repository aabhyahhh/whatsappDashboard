import mongoose from 'mongoose';
const operatingHoursSchema = new mongoose.Schema({
    openTime: { type: String, required: true },
    closeTime: { type: String, required: true },
    days: { type: [Number], required: true }
}, { _id: false });
export default operatingHoursSchema;
