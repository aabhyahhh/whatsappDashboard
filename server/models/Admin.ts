import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define the interface for Admin document
export interface IAdmin extends Document {
    username: string;
    password: string;
    email: string;
    role: 'admin' | 'super_admin' | 'onground';
    createdAt: Date;
    lastLogin?: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

// Define the admin user schema
const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    role: {
        type: String,
        enum: ['admin', 'super_admin', 'onground'],
        default: 'admin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    }
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Create and export the model with proper typing
export const Admin = (mongoose.models.Admin || mongoose.model<IAdmin>('Admin', adminSchema)) as mongoose.Model<IAdmin>; 