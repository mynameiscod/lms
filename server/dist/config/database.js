"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas';
        console.log(`🔗 Connecting to MongoDB: ${mongoURI}`);
        const connection = await mongoose_1.default.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            retryWrites: false
        });
        console.log(`✅ MongoDB Connected: ${connection.connection.host}`);
    }
    catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.warn('⚠️  Continuing anyway - database operations may fail');
    }
};
exports.connectDB = connectDB;
exports.default = exports.connectDB;
//# sourceMappingURL=database.js.map