import mongoose from 'mongoose';
declare const operatingHoursSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    _id: false;
}, {
    openTime: string;
    closeTime: string;
    days: number[];
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    openTime: string;
    closeTime: string;
    days: number[];
}>, {}> & mongoose.FlatRecord<{
    openTime: string;
    closeTime: string;
    days: number[];
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export default operatingHoursSchema;
