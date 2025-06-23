import mongoose, { Document } from 'mongoose';
export interface IMessage extends Document {
    from: string;
    to: string;
    body: string;
    direction: 'inbound' | 'outbound';
    timestamp: Date;
    location?: {
        latitude: number;
        longitude: number;
    };
    address?: string;
    label?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Message: mongoose.Model<IMessage, {}, {}, {}, mongoose.Document<unknown, {}, IMessage, {}> & IMessage & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
