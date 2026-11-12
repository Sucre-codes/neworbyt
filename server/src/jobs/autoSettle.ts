import { autoSettleOverdue } from "../services/circle.service";

let running = false;

export function startAutoSettle() {
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await autoSettleOverdue();
    } finally {
      running = false;
    }
  }, 15_000);
  console.log("Auto-settle job running");
}