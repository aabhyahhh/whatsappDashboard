import mongoose, { Schema, Document } from 'mongoose';
import operatingHoursSchema from './operatingHoursModel.js';
// Define the dish schema
const dishSchema = new Schema({
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: false },
}, { _id: false }); // _id: false prevents Mongoose from adding a default _id to sub-documents
// Define the user schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    contactNumber: {
        type: String,
        required: true,
        index: true
    },
    mobile_verified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        required: false
    },
    openTime: {
        type: String,
        required: false
    },
    closeTime: {
        type: String,
        required: false
    },
    mapsLink: {
        type: String,
        required: false
    },
    operatingHours: {
        type: operatingHoursSchema,
        required: true
    },
    bestDishes: {
        type: [dishSchema],
        required: false
    },
    menuLink: {
        type: String,
        required: false
    },
    foodType: {
        type: String,
        enum: ['veg', 'nonveg', 'swaminarayan', 'jain'],
        required: false
    },
    profilePictures: {
        type: [String],
        required: false,
        default: []
    },
    preferredLanguages: {
        type: [String],
        required: false,
        default: []
    },
    foodCategories: {
        type: [String],
        required: false,
        default: []
    },
    stallType: {
        type: String,
        enum: ['fixed', 'mobile'],
        required: false
    },
    whatsappConsent: {
        type: Boolean,
        required: false,
        default: false
    },
    onboardingType: {
        type: String,
        required: false
    },
    aadharNumber: {
        type: String,
        required: false
    },
    aadharFrontUrl: {
        type: String,
        required: false
    },
    aadharBackUrl: {
        type: String,
        required: false
    },
    panNumber: {
        type: String,
        required: false
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
            required: false
        },
        coordinates: {
            type: [Number],
            default: [0, 0],
            required: false
        }
    }
}, { timestamps: true });
// Update `updatedAt` field on save
userSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
userSchema.index({ updatedAt: -1 });
userSchema.on('index', function (err) {
    if (err) {
        console.error('Error creating indexes:', err);
    }
    else {
        console.log('User model indexes created successfully');
    }
});
// Create and export the model
export default mongoose.model('User', userSchema);
