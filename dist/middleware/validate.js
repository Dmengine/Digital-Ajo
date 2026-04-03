"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = void 0;
const validateBody = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        const details = error.details.map((d) => d.message);
        res.status(400).json({ success: false, message: "Validation failed", details });
        return;
    }
    req.body = value;
    next();
};
exports.validateBody = validateBody;
