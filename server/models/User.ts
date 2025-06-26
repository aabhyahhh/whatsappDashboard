import mongoose, { Schema, Document } from 'mongoose';
import operatingHoursSchema from './operatingHoursModel.js';

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
        days: number[];
    };
    foodType?: string;
    profilePictures?: string[];
    bestDishes?: IDish[];
    menuLink?: string;
    createdAt: Date;
    updatedAt: Date;
    status?: string;
    openTime?: string;
    closeTime?: string;
    preferredLanguages?: string[];
    foodCategories?: string[];
    stallType?: 'fixed' | 'mobile';
    whatsappConsent?: boolean;
    onboardingType?: string;
    aadharNumber?: string;
    aadharFrontUrl?: string;
    aadharBackUrl?: string;
    panNumber?: string;
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

// Add isOpenNow method to userSchema
userSchema.methods.isOpenNow = function() {
    if (!this.operatingHours || !this.operatingHours.openTime || !this.operatingHours.closeTime || !this.operatingHours.days) {
        return false;
    }
    const now = new Date();
    const day = now.getDay(); // 0=Sunday, 6=Saturday
    if (!this.operatingHours.days.includes(day)) return false;

    function parseTime(str: string) {
        // Expects format like '4:00 PM'
        const [time, period] = str.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + m;
    }
    const openMinutes = parseTime(this.operatingHours.openTime);
    const closeMinutes = parseTime(this.operatingHours.closeTime);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (openMinutes < closeMinutes) {
        return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
    } else {
        // Overnight case
        return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
    }
};

// Create and export the model
export default mongoose.model<IUser>('User', userSchema); 