import mongoose from "mongoose";

export function getHealth() {
  return { ok: true, db: mongoose.connection.readyState === 1 };
}