import mongoose, { Document } from 'mongoose';
interface IDish {
    name: string;
    price?: number;
}
export interface IUser extends Document {
    name: string;
    contactNumber: string;
    mapsLink?: string;
    location?: {
        type: string;
        coordinates: number[];
    };
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
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
