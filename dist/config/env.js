"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const required = (name) => {
    const v = process.env[name];
    if (!(v === null || v === void 0 ? void 0 : v.trim())) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return v.trim();
};
const paystackKey = () => {
    var _a;
    // Some environments mask variables named PAYSTACK_SECRET to "...".
    // Support a safer alias while remaining backward-compatible.
    const alias = (_a = process.env.AJOPAY_PAYSTACK_KEY) === null || _a === void 0 ? void 0 : _a.trim();
    if (alias)
        return alias;
    return required("PAYSTACK_SECRET");
};
const resolveCorsOrigin = () => {
    var _a, _b, _c, _d;
    const explicit = (_a = process.env.CORS_ORIGIN) === null || _a === void 0 ? void 0 : _a.trim();
    if (explicit)
        return explicit;
    // Render commonly exposes this service URL automatically.
    const renderUrl = (_b = process.env.RENDER_EXTERNAL_URL) === null || _b === void 0 ? void 0 : _b.trim();
    if (renderUrl)
        return renderUrl;
    // Optional aliases some deployments use.
    const frontendUrl = (_c = process.env.FRONTEND_URL) === null || _c === void 0 ? void 0 : _c.trim();
    if (frontendUrl)
        return frontendUrl;
    const nodeEnv = (_d = process.env.NODE_ENV) !== null && _d !== void 0 ? _d : "development";
    if (nodeEnv === "production") {
        throw new Error("Set CORS_ORIGIN (or FRONTEND_URL). On Render you can also rely on RENDER_EXTERNAL_URL if available.");
    }
    return "*";
};
exports.env = {
    // MVP runs in "test" mode by default (NOT production) unless explicitly set.
    // This prevents production-only fallbacks (e.g., CORS) from being triggered silently.
    nodeEnv: (_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : "test",
    port: Number(process.env.PORT) || 3000,
    mongoUri: () => required("MONGO_URI"),
    jwtSecret: () => required("JWT_SECRET"),
    /**
     * Generic webhook secret for MVP (deposit events, etc).
     * SECURITY: webhook endpoints must be signed to prevent spoofing.
     */
    webhookSecret: () => {
        var _a, _b;
        const v = (_a = process.env.WEBHOOK_SECRET) === null || _a === void 0 ? void 0 : _a.trim();
        if (v)
            return v;
        const fallback = (_b = process.env.PAYSTACK_WEBHOOK_SECRET) === null || _b === void 0 ? void 0 : _b.trim();
        if (fallback)
            return fallback;
        return paystackKey();
    },
    /** Required when calling Paystack-backed wallet endpoints */
    paystackSecret: () => paystackKey(),
    paystackWebhookSecret: () => { var _a; return ((_a = process.env.PAYSTACK_WEBHOOK_SECRET) === null || _a === void 0 ? void 0 : _a.trim()) || paystackKey(); },
    corsOrigin: resolveCorsOrigin(),
};
