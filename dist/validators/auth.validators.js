"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.registerSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(1).max(120).required(),
    email: joi_1.default.string().trim().lowercase().email().max(254).required(),
    phone: joi_1.default.string().trim().min(10).max(20).required(),
    username: joi_1.default.string().trim().lowercase().min(3).max(32).pattern(/^[a-z0-9_]+$/).required(),
    password: joi_1.default.string().min(8).max(128).required(),
});
exports.loginSchema = joi_1.default.object({
    emailOrUsername: joi_1.default.string().trim().min(1).max(254).required(),
    password: joi_1.default.string().min(1).max(128).required(),
});
