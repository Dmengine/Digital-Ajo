import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
    users: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    order: {
        type: Number,
        required: true
    },
    hasReceived: {
        type: Boolean,
        default: false,
    }
}, {_id: false});

const groupAjoModel = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    contributionAmount: {
        type: Number,
        required: true
    },
    frequency: {
        type: String,
        enum: [ "daily", "weekly", "monthly" ],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    members: [memberSchema],
    cuurentRound: {
        type: Number,
        default: 1
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    roundNumber: {
        type: Number,
        default: 1
    }
}, { timestamps: true });

export const GroupAjoModel = mongoose.model("GroupAjo", groupAjoModel);