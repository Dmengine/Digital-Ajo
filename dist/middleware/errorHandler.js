"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const HttpError_1 = require("../errors/HttpError");
const env_1 = require("../config/env");
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError_1.HttpError) {
        res.status(err.statusCode).json({ success: false, message: err.message });
        return;
    }
    if (env_1.env.nodeEnv !== "production") {
        console.error(err);
    }
    else {
        console.error(err instanceof Error ? err.message : "Unknown error");
    }
    res.status(500).json({ success: false, message: "Internal server error" });
};
exports.errorHandler = errorHandler;
