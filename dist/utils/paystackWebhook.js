"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaystackSignature = void 0;
const crypto_1 = __importDefault(require("crypto"));
const verifyPaystackSignature = (rawBody, signatureHeader, secret) => {
    if (!(rawBody === null || rawBody === void 0 ? void 0 : rawBody.length) || !signatureHeader)
        return false;
    const hash = crypto_1.default.createHmac("sha512", secret).update(rawBody).digest("hex");
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(hash), Buffer.from(signatureHeader));
    }
    catch (_a) {
        return false;
    }
};
exports.verifyPaystackSignature = verifyPaystackSignature;
