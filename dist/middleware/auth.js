"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const requireAuth = (req, res, next) => {
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
        req.userId = id;
        next();
    }
    catch (_a) {
        res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};
exports.requireAuth = requireAuth;
