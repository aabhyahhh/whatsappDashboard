import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for Message document
export interface IMessage extends Document {
    from: string;  // Sender's phone number
    to: string;    // Receiver's phone number (our WhatsApp number)
    body: string;  // Message content
    direction: 'inbound' | 'outbound';  // Message direction
    timestamp: Date;  // When the message was sent/received
    location?: {  // Optional location data if message contains Google Maps link
        latitude: number;
        longitude: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

// Define the message schema
const messageSchema: Schema<IMessage> = new Schema({
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
        required: true,
        trim: true,
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
messageSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Create indexes for common queries
messageSchema.index({ from: 1, to: 1 });  // For finding conversations between two numbers
messageSchema.index({ timestamp: -1 });   // For sorting messages by time
messageSchema.index({ direction: 1 });    // For filtering by message direction

// Create and export the model
export const Message = mongoose.model<IMessage>('Message', messageSchema); 