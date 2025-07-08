import mongoose, { Document, Schema } from 'mongoose';
// Define the message schema
const messageSchema = new Schema({
    from: {
        type: String,
        required: true,
        trim: true,
    },
    to: {
        type: String,
        required: true,
        trim: true,
    },
    body: {
        type: String,
        required: false,
        trim: true,
        default: '[location message]',
    },
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: true,
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
    },
    location: {
        latitude: { type: Number },
        longitude: { type: Number },
    },
    address: {
        type: String,
        required: false,
        trim: true,
    },
    label: {
        type: String,
        required: false,
        trim: true,
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
messageSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
// Create indexes for common queries
messageSchema.index({ from: 1, to: 1 }); // For finding conversations between two numbers
messageSchema.index({ timestamp: -1 }); // For sorting messages by time
messageSchema.index({ direction: 1 }); // For filtering by message direction
// Create and export the model
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
