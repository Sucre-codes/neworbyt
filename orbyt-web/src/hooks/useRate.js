import { useEffect, useState } from "react";

// Free daily-updated rates, no key needed. We refresh every 30 minutes in the background.
const URL = "https://open.er-api.com/v6/latest/USD";
const KEY = "orbyt-rate";
const EVERY = 30 * 60 * 1000;

function cached() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

export function useRate() {
  const [state, setState] = useState(() => {
    const c = cached();
    return c ? { ...c, live: false } : { rate: null, updated: null, live: false };
  });

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch(URL);
        const data = await res.json();
        const rate = data?.rates?.NGN;
        if (!rate) throw new Error("no rate");
        const next = { rate, updated: Date.now() };
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
        if (!stop) setState({ ...next, live: true });
      } catch {
        // keep showing the last known rate
      }
    }
    load();
    const id = setInterval(load, EVERY);
    return () => { stop = true; clearInterval(id); };
  }, []);

  return state;
}
