import { Schema, model } from "mongoose";

const circleSchema = new Schema(
  {
    name: { type: String, required: true },
    contractId: { type: String, required: true, unique: true },
    inviteCode: { type: String, required: true, unique: true },
    organizer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    amount: { type: Number, required: true },
    deposit: { type: Number, required: true },
    maxMembers: { type: Number, required: true },
    joinDeadline: { type: Date, required: true },
    contributionInterval: { type: Number, required: true },
    contributionsPerPayout: { type: Number, required: true },
    finished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Circle = model("Circle", circleSchema);