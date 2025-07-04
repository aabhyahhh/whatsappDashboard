var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import mongoose from 'mongoose';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
var MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';
var setMobileVerifiedFlag = function () { return __awaiter(void 0, void 0, void 0, function () {
    var verifiedPhones, phoneNumbers, result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(mongoose.connection.readyState === 0)) return [3 /*break*/, 2];
                return [4 /*yield*/, mongoose.connect(MONGODB_URI)];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, 6, 8]);
                return [4 /*yield*/, Verification.find({ isVerified: true }).select('phone -_id')];
            case 3:
                verifiedPhones = _a.sent();
                phoneNumbers = verifiedPhones.map(function (v) { return v.phone; });
                if (phoneNumbers.length === 0) {
                    console.log('No verified phone numbers found. No updates needed.');
                    return [2 /*return*/];
                }
                console.log("Found ".concat(phoneNumbers.length, " verified phone numbers. Starting update..."));
                return [4 /*yield*/, User.updateMany({ contactNumber: { $in: phoneNumbers } }, { $set: { mobile_verified: true } })];
            case 4:
                result = _a.sent();
                console.log('Migration completed.');
                console.log("- Matched ".concat(result.matchedCount, " users."));
                console.log("- Modified ".concat(result.modifiedCount, " users."));
                return [3 /*break*/, 8];
            case 5:
                error_1 = _a.sent();
                console.error('Error during migration:', error_1);
                return [3 /*break*/, 8];
            case 6: return [4 /*yield*/, mongoose.disconnect()];
            case 7:
                _a.sent();
                console.log('Database connection closed.');
                return [7 /*endfinally*/];
            case 8: return [2 /*return*/];
        }
    });
}); };
setMobileVerifiedFlag();
