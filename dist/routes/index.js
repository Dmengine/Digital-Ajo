"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_route_1 = __importDefault(require("./auth.route"));
const group_route_1 = __importDefault(require("./group.route"));
const wallet_route_1 = __importDefault(require("./wallet.route"));
const router = (0, express_1.Router)();
router.use("/auth", auth_route_1.default);
router.use("/groups", group_route_1.default);
router.use("/wallet", wallet_route_1.default);
exports.default = router;
