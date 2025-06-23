import mongoose from 'mongoose';
declare const _default: mongoose.Model<{
    isVerified: boolean;
    phone?: string | null | undefined;
    otp?: string | null | undefined;
    expiresAt?: NativeDate | null | undefined;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    isVerified: boolean;
    phone?: string | null | undefined;
    otp?: string | null | undefined;
    expiresAt?: NativeDate | null | undefined;
}, {}> & {
    isVerified: boolean;
    phone?: string | null | undefined;
    otp?: string | null | undefined;
    expiresAt?: NativeDate | null | undefined;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    isVerified: boolean;
    phone?: string | null | undefined;
    otp?: string | null | undefined;
    expiresAt?: NativeDate | null | undefined;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    isVerified: boolean;
    phone?: string | null | undefined;
    otp?: string | null | undefined;
    expiresAt?: NativeDate | null | undefined;
}>, {}> & mongoose.FlatRecord<{
    isVerified: boolean;
    phone?: string | null | undefined;
    otp?: string | null | undefined;
    expiresAt?: NativeDate | null | undefined;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export default _default;
