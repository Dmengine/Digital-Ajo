"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const required = (name) => {
    const v = process.env[name];
    if (!(v === null || v === void 0 ? void 0 : v.trim())) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return v;
};
exports.env = {
    nodeEnv: (_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : "development",
    port: Number(process.env.PORT) || 3000,
    mongoUri: () => required("MONGO_URI"),
    jwtSecret: () => required("JWT_SECRET"),
    /** Required when calling Paystack-backed wallet endpoints */
    paystackSecret: () => required("PAYSTACK_SECRET"),
    paystackWebhookSecret: () => { var _a; return ((_a = process.env.PAYSTACK_WEBHOOK_SECRET) === null || _a === void 0 ? void 0 : _a.trim()) || required("PAYSTACK_SECRET"); },
    corsOrigin: ((_b = process.env.CORS_ORIGIN) === null || _b === void 0 ? void 0 : _b.trim()) || "*",
};
