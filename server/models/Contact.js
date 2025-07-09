import mongoose, { Document, Schema } from 'mongoose';
// Define the contact schema
const contactSchema = new Schema({
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    lastSeen: {
        type: Date,
        required: true,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});
// Update `updatedAt` field on save
contactSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
// Create indexes for common queries
// Remove unique constraint from phone index
// contactSchema.index({ phone: 1 }, { unique: true });
contactSchema.index({ phone: 1 });
contactSchema.index({ lastSeen: -1 }); // For sorting contacts by last activity
// Create and export the model
export const Contact = mongoose.model('Contact', contactSchema);
