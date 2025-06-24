import mongoose, { Document } from 'mongoose';
export interface IContact extends Document {
    phone: string;
    lastSeen: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Contact: mongoose.Model<IContact, {}, {}, {}, mongoose.Document<unknown, {}, IContact, {}> & IContact & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
