import mongoose, { Document } from 'mongoose';
export interface IAdmin extends Document {
    username: string;
    password: string;
    email: string;
    role: 'admin' | 'super_admin';
    createdAt: Date;
    lastLogin?: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
export declare const Admin: mongoose.Model<IAdmin, {}, {}, {}, mongoose.Document<unknown, {}, IAdmin, {}> & IAdmin & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
