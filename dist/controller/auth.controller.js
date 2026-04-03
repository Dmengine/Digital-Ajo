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
exports.login = exports.register = void 0;
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
    const token = jsonwebtoken_1.default.sign({ id: newUser.id }, env_1.env.jwtSecret(), { expiresIn: "7d" });
    res.status(201).json({
        success: true,
        message: "User registered successfully",
        token,
        user: newUser.toJSON(),
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
    const token = jsonwebtoken_1.default.sign({ id: existingUser.id }, env_1.env.jwtSecret(), { expiresIn: "7d" });
    res.status(200).json({
        success: true,
        message: "User logged in successfully",
        token,
        user: existingUser.toJSON(),
    });
}));
