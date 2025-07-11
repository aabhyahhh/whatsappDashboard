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
    },
    vendorIndex: {
        type: String,
        required: false,
        index: true
    },
    primaryLanguage: {
        type: String,
        required: false
    },
    entryType: {
        type: String,
        enum: ['O', 'M', 'W'],
        required: false
    },
    addedBy: {
        type: String,
        required: false
    }
}, { timestamps: true });
// Update `updatedAt` field on save
userSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
userSchema.index({ updatedAt: -1 });
userSchema.index({ location: '2dsphere' });
userSchema.on('index', function (err) {
    if (err) {
        console.error('Error creating indexes:', err);
    }
    else {
        console.log('User model indexes created successfully');
    }
});
// Add isOpenNow method to userSchema
userSchema.methods.isOpenNow = function () {
    if (!this.operatingHours || !this.operatingHours.openTime || !this.operatingHours.closeTime || !this.operatingHours.days) {
        console.log('isOpenNow: Missing operatingHours data');
        return false;
    }
    const now = new Date();
    const day = now.getDay(); // 0=Sunday, 6=Saturday
    const yesterday = (day + 6) % 7;
    function parseTime(str) {
        // Expects format like '4:00 PM'
        const [time, period] = str.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12)
            h += 12;
        if (period === 'AM' && h === 12)
            h = 0;
        return h * 60 + m;
    }
    const openMinutes = parseTime(this.operatingHours.openTime);
    const closeMinutes = parseTime(this.operatingHours.closeTime);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const daysArr = this.operatingHours.days;
    let result;
    if (openMinutes < closeMinutes) {
        // Normal case: open and close on same day
        result = daysArr.includes(day) && nowMinutes >= openMinutes && nowMinutes < closeMinutes;
    }
    else {
        // Overnight case: openTime > closeTime
        if (nowMinutes >= openMinutes) {
            result = daysArr.includes(day);
        }
        else if (nowMinutes < closeMinutes) {
            result = daysArr.includes(yesterday);
        }
        else {
            result = false;
        }
    }
    console.log('[isOpenNow]', {
        now: now.toString(),
        day,
        yesterday,
        openMinutes,
        closeMinutes,
        nowMinutes,
        daysArr,
        result
    });
    return result;
};
// Create and export the model
export const User = mongoose.models.User || mongoose.model('User', userSchema);
