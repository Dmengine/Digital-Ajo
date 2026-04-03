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
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const user_model_1 = require("../models/user.model");
const requireAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const header = req.headers.authorization;
    const token = (header === null || header === void 0 ? void 0 : header.startsWith("Bearer ")) ? header.slice(7).trim() : null;
    if (!token) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret());
        const id = typeof payload.id === "string" ? payload.id : undefined;
        if (!id) {
            res.status(401).json({ success: false, message: "Invalid token" });
            return;
        }
        const tokenVersion = typeof payload.tokenVersion === "number" ? payload.tokenVersion : 0;
        const user = yield user_model_1.UserModel.findById(id).select("tokenVersion");
        if (!user || user.tokenVersion !== tokenVersion) {
            res.status(401).json({ success: false, message: "Invalid or expired token" });
            return;
        }
        req.userId = id;
        next();
    }
    catch (_a) {
        res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
});
exports.requireAuth = requireAuth;
