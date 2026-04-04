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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.submitTier1Kyc = exports.me = exports.logout = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../models/user.model");
const env_1 = require("../config/env");
const HttpError_1 = require("../errors/HttpError");
const asyncHandler_1 = require("../middleware/asyncHandler");
exports.register = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, phone, password, username } = req.body;
    const existingUser = yield user_model_1.UserModel.findOne({ email });
    if (existingUser)
        throw new HttpError_1.HttpError(400, "User already exists");
    const existingUsername = yield user_model_1.UserModel.findOne({ username });
    if (existingUsername)
        throw new HttpError_1.HttpError(400, "Username already taken");
    const hashedPassword = yield bcrypt_1.default.hash(password, 12);
    const newUser = yield user_model_1.UserModel.create({
        name,
        email,
        phone,
        username,
        password: hashedPassword,
        wallets: { main: 0, locked: [] },
    });
    const token = jsonwebtoken_1.default.sign({ id: newUser.id, tokenVersion: newUser.tokenVersion }, env_1.env.jwtSecret(), { expiresIn: "7d" });
    const publicUser = {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
    };
    res.status(201).json({
        success: true,
        message: "User registered successfully",
        token,
        user: publicUser,
    });
}));
exports.login = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { emailOrUsername, password } = req.body;
    const existingUser = yield user_model_1.UserModel.findOne({
        $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername.toLowerCase() }],
    }).select("+password");
    if (!existingUser)
        throw new HttpError_1.HttpError(401, "Invalid credentials");
    const comparePassword = yield bcrypt_1.default.compare(password, existingUser.password);
    if (!comparePassword)
        throw new HttpError_1.HttpError(401, "Invalid credentials");
    const token = jsonwebtoken_1.default.sign({ id: existingUser.id, tokenVersion: existingUser.tokenVersion }, env_1.env.jwtSecret(), { expiresIn: "7d" });
    const publicUser = {
        _id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        username: existingUser.username,
    };
    res.status(200).json({
        success: true,
        message: "User logged in successfully",
        token,
        user: publicUser,
    });
}));
exports.logout = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const user = yield user_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } }, { new: true });
    if (!user)
        throw new HttpError_1.HttpError(404, "User not found");
    res.status(200).json({ success: true, message: "Logged out successfully" });
}));
exports.me = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const userId = req.userId;
    const user = yield user_model_1.UserModel.findById(userId).select("name email username phone kycTier basicKycCompleted profileImage wallets.main reliabilityScore isRestricted isFlagged");
    if (!user)
        throw new HttpError_1.HttpError(404, "User not found");
    res.status(200).json({
        success: true,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            phone: user.phone,
            kycTier: user.kycTier,
            basicKycCompleted: user.basicKycCompleted,
            profileImage: (_a = user.profileImage) !== null && _a !== void 0 ? _a : null,
            reliabilityScore: user.reliabilityScore,
            isRestricted: user.isRestricted,
            isFlagged: user.isFlagged,
            wallets: {
                main: (_c = (_b = user.wallets) === null || _b === void 0 ? void 0 : _b.main) !== null && _c !== void 0 ? _c : 0,
            },
        },
    });
}));
exports.submitTier1Kyc = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { bvnOrNin, accountNumber, bankName, accountName } = req.body;
    const user = yield user_model_1.UserModel.findByIdAndUpdate(userId, {
        kycTier: 1,
        basicKycCompleted: true,
    }, { new: true });
    if (!user)
        throw new HttpError_1.HttpError(404, "User not found");
    // Keep updates separate to avoid accidental overwrites of other bank fields.
    if (!user.bankAccount)
        user.bankAccount = {};
    user.bankAccount.accountNumber = accountNumber;
    user.bankAccount.bankName = bankName;
    user.bankAccount.accountName = accountName;
    user.kycProfile = {
        verified: true,
        identityType: bvnOrNin.trim().length === 11 ? "bvn" : "nin",
        identityLast4: bvnOrNin.trim().slice(-4),
        legalName: user.name,
        verifiedBankAccountName: accountName,
        verifiedAt: new Date(),
    };
    yield user.save();
    res.status(200).json({ success: true, message: "Tier 1 KYC submitted successfully" });
}));
exports.uploadAvatar = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { imageDataUrl } = req.body;
    const user = yield user_model_1.UserModel.findByIdAndUpdate(userId, { profileImage: imageDataUrl }, { new: true });
    if (!user)
        throw new HttpError_1.HttpError(404, "User not found");
    res.status(200).json({ success: true, message: "Avatar updated successfully" });
}));
