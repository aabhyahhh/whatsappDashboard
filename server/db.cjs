"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
var mongoose_1 = require("mongoose");
// TODO: Replace this with your actual MongoDB Atlas connection string
// You can get this from MongoDB Atlas dashboard:
// 1. Click "Connect" on your cluster
// 2. Choose "Connect your application"
// 3. Copy the connection string and replace <username>, <password>, <cluster>, and <database>
// Example: mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/whatsapp?retryWrites=true&w=majority
var MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
    console.error('Please create a .env file with your MongoDB connection string:');
    console.error('MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority');
    process.exit(1);
}
// Connection options - removed deprecated options
var options = {};
// Function to connect to MongoDB
var connectDB = function () { return __awaiter(void 0, void 0, void 0, function () {
    var db, collections, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, mongoose_1.default.connect(MONGODB_URI, options)];
            case 1:
                _a.sent();
                console.log('✅ MongoDB connected successfully');
                db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                // Log the database name
                console.log("\uD83D\uDCC1 Connected to database: ".concat(db.databaseName));
                return [4 /*yield*/, db.listCollections().toArray()];
            case 2:
                collections = _a.sent();
                console.log('📚 Available collections:', collections.map(function (c) { return c.name; }));
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('❌ MongoDB connection error:', error_1);
                process.exit(1); // Exit process with failure
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.connectDB = connectDB;
// Handle connection events
mongoose_1.default.connection.on('error', function (err) {
    console.error('MongoDB connection error:', err);
});
mongoose_1.default.connection.on('disconnected', function () {
    console.log('MongoDB disconnected');
});
// Handle process termination
