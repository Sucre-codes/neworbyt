import { Schema, model } from "mongoose";

const activitySchema = new Schema(
  {
    circle: { type: Schema.Types.ObjectId, ref: "Circle", required: true, index: true },
    type: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Activity = model("Activity", activitySchema);