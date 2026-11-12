import { createContext, useContext } from "react";
import { useRate } from "../hooks/useRate.js";

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const Ctx = createContext(null);
// Covers cent rounding and small rate moves so a deposit never lands short of what was paid.
const DEPOSIT_MARGIN = 0.001;

// Inside the app every amount is shown in naira. Balances and circles are held in USDC underneath.
export function RateProvider({ children }) {
  const r = useRate();
  const value = {
    ready: !!r.rate,
    fmt: (usdc) => (r.rate ? money.format(Number(usdc) * r.rate) : "…"),
    toUsdcDeposit: (naira) => (r.rate ? Math.ceil((naira / r.rate) * (1 + DEPOSIT_MARGIN) * 100) / 100 : null),
    toUsdc: (naira) => (r.rate ? Math.round((naira / r.rate) * 100) / 100 : null),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useNaira = () => useContext(Ctx);
