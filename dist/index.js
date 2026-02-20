"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const ConnectDB_1 = require("./mongodb/ConnectDB");
dotenv_1.default.config();
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ limit: '10mb' }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use('/api', auth_route_1.default);
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send('API is running....');
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
(0, ConnectDB_1.connectDB)();
