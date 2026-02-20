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
exports.Login = exports.Register = void 0;
const auth_model_1 = require("../models/auth.model");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, phone, password } = req.body;
        if (!name || !email || !phone || !password) {
            return res.status(400).send({
                message: "Please provide all required fields",
                success: false,
            });
        }
        const existingUser = yield auth_model_1.UserModel.findOne({ email });
        if (existingUser) {
            return res.status(400).send({
                message: "User already exists",
                success: false,
            });
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const newUser = yield auth_model_1.UserModel.create({
            name,
            email,
            phone,
            password: hashedPassword,
            wallets: {
                normal: 0,
                emergency: 0,
                fixed: [],
            }
        });
        const token = jsonwebtoken_1.default.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).send({
            message: 'User registered successfully',
            success: true,
            token,
            newUser,
        });
    }
    catch (error) {
        console.log("Error in register controller", error);
        res.status(500).send({ message: "Server Error" });
    }
});
exports.Register = Register;
const Login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send({
                message: "Please provide all required fields",
                success: false,
            });
        }
        const existingUser = yield auth_model_1.UserModel.findOne({ email });
        if (!existingUser) {
            return res.status(404).send({
                message: "User not found",
                success: false,
            });
        }
        const comparePassword = yield bcrypt_1.default.compare(password, existingUser.password);
        if (!comparePassword) {
            return res.status(400).send({
                message: "Invalid credentials",
                success: false,
            });
        }
        const token = jsonwebtoken_1.default.sign({ id: existingUser.id }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });
        res.status(200).send({
            message: 'User logged in successfully',
            success: true,
            token,
            existingUser,
        });
    }
    catch (error) {
        console.log("Error in login controller", error);
        res.status(500).send({
            message: "Login failed",
            success: false,
        });
    }
});
exports.Login = Login;
