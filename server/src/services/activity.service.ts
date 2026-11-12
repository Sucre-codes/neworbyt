import { Activity } from "../models/activity.model";

export async function logActivity(
  circleId: string,
  type: string,
  message: string,
  userId?: string,
  data?: unknown
) {
  await Activity.create({ circle: circleId, type, message, user: userId, data });
}

export async function listActivity(circleId: string) {
  const items = await Activity.find({ circle: circleId }).sort({ createdAt: -1 }).limit(50);
  return items.map((a) => ({
    id: a.id,
    type: a.type,
    message: a.message,
    createdAt: a.get("createdAt"),
  }));
}