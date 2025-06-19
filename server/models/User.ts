import mongoose, { Schema, Document } from 'mongoose';
import operatingHoursSchema from './operatingHoursModel';

// Define the interface for Dish sub-document
interface IDish {
    name: string;
    price?: number;
}

// Define the interface for User document
export interface IUser extends Document {
    name: string;
    contactNumber: string;
    mapsLink: string;
    operatingHours: {
        openTime: string;
        closeTime: string;
        days: string[];
    };
    foodType?: string;
    profilePictureUrl?: string;
    bestDishes?: IDish[];
    menuLink?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Define the dish schema
const dishSchema: Schema<IDish> = new Schema({
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
    mapsLink: {
        type: String,
        required: true
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
    profilePictureUrl: {
        type: String,
        required: false
    }
}, { timestamps: true });

// Update `updatedAt` field on save
userSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

userSchema.index({ updatedAt: -1 });

userSchema.on('index', function(err: any) {
    if (err) {
        console.error('Error creating indexes:', err);
    } else {
        console.log('User model indexes created successfully');
    }
});

// Create and export the model
export default mongoose.model<IUser>('User', userSchema); 