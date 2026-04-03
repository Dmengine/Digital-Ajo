"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const ConnectDB_1 = require("./mongodb/ConnectDB");
const env_1 = require("./config/env");
const index_1 = __importDefault(require("./routes/index"));
const errorHandler_1 = require("./middleware/errorHandler");
const chatSocket_1 = require("./socket/chatSocket");
dotenv_1.default.config();
try {
    env_1.env.mongoUri();
    env_1.env.jwtSecret();
}
catch (e) {
    console.error(e);
    process.exit(1);
}
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, "");
const configuredOrigins = env_1.env.corsOrigin === "*"
    ? true
    : env_1.env.corsOrigin
        .split(",")
        .map((s) => normalizeOrigin(s))
        .filter(Boolean);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: configuredOrigins,
    credentials: true,
}));
app.use(express_1.default.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
        // `req.rawBody` is attached for Paystack webhook signature verification.
        // Use a cast to avoid ts-node-dev type-resolution issues.
        req.rawBody = buf;
    },
}));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.get("/", (_req, res) => {
    res.json({ name: "AjoPay API", status: "ok" });
});
app.use("/api", index_1.default);
app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Not found" });
});
app.use((err, req, res, next) => {
    (0, errorHandler_1.errorHandler)(err, req, res, next);
});
const PORT = env_1.env.port;
const httpServer = http_1.default.createServer(app);
(0, chatSocket_1.attachChatSocket)(httpServer);
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
void (0, ConnectDB_1.connectDB)();
