"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controller/auth.controller");
const router = (0, express_1.Router)();
router.post('/register', auth_controller_1.Register);
router.post('/login', auth_controller_1.Login);
exports.default = router;
