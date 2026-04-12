"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = void 0;
const notification_model_1 = require("../models/notification.model");
const user_model_1 = require("../models/user.model");
const env_1 = require("../config/env");
const realtime_1 = require("../socket/realtime");
const twilio_service_1 = require("./twilio.service");
const notify = (userId, message, metadata) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = yield notification_model_1.NotificationModel.create({
        user: userId,
        message,
        metadata,
    });
    const payload = {
        _id: String(notification._id),
        user: userId,
        message,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        isRead: false,
    };
    const socketDelivered = (0, realtime_1.emitToUser)(userId, "notification:new", payload);
    const update = {};
    if (socketDelivered)
        update.socketDeliveredAt = new Date();
    try {
        if (env_1.env.twilioConfigured()) {
            const user = yield user_model_1.UserModel.findById(userId).select("phone").lean();
            if (user === null || user === void 0 ? void 0 : user.phone) {
                yield (0, twilio_service_1.sendTwilioSms)(user.phone, message);
                update.smsDeliveredAt = new Date();
            }
        }
    }
    catch (e) {
        update.smsError = e instanceof Error ? e.message : "SMS delivery failed";
    }
    if (Object.keys(update).length > 0) {
        yield notification_model_1.NotificationModel.updateOne({ _id: notification._id }, { $set: update });
    }
});
exports.notify = notify;
