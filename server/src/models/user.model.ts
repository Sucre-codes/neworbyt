import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    publicKey: { type: String, required: true },
    encryptedSecret: { type: String, required: true },
    blacklisted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = model("User", userSchema);