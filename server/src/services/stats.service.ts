import { Activity } from "../models/activity.model";
import { Circle } from "../models/circle.model";

const total = (items: { data?: any }[]) =>
  items.reduce((sum, a) => sum + (Number(a.data?.amount) || 0), 0);

export async function getStats() {
  const [activePools, paid, payouts] = await Promise.all([
    Circle.countDocuments({ finished: false }),
    Activity.find({ type: "paid" }, { data: 1 }).lean(),
    Activity.find({ type: "payout" }, { data: 1 }).lean(),
  ]);
  return {
    totalValue: Math.round(total(paid)),
    activePools,
    completedCycles: payouts.length,
    averagePayout: payouts.length ? Math.round(total(payouts) / payouts.length) : 0,
  };
} 