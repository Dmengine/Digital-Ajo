"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaystack = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
let client = null;
const getPaystack = () => {
    if (!client) {
        client = axios_1.default.create({
            baseURL: "https://api.paystack.co",
            headers: {
                Authorization: `Bearer ${env_1.env.paystackSecret()}`,
                "Content-Type": "application/json",
            },
        });
    }
    return client;
};
exports.getPaystack = getPaystack;
