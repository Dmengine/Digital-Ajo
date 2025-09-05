import { required } from "joi";
import mongoose from "mongoose";

const contributionModel = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    groupAjo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GroupAjo",
        required: true
    },
    status: {
        type: String,
        enum: [ "pending", "completed", "failed"],
        default: "pending"
    },
    cycle: {
        type: Number,
        required: true
    },
    turn: {
        type: Number,
        required: true
    }
}, { timestamps: true });

export const ContributionModel = mongoose.model("Contribution", contributionModel);