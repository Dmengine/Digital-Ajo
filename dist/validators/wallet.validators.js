"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.depositVerifySchema = exports.withdrawSchema = exports.depositInitSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.depositInitSchema = joi_1.default.object({
    amount: joi_1.default.number().positive().max(10000000).required(),
});
exports.withdrawSchema = joi_1.default.object({
    amount: joi_1.default.number().positive().max(10000000).required(),
    idempotencyKey: joi_1.default.string().trim().min(8).max(200).optional(),
});
exports.depositVerifySchema = joi_1.default.object({
    reference: joi_1.default.string().trim().min(3).max(200).required(),
});
