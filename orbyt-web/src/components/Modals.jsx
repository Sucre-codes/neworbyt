import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, CircleCheck, CreditCard, Landmark, LoaderCircle } from "lucide-react";
import Modal from "./Modal.jsx";
import { api, ENDPOINTS } from "../lib/api.js";
import { useNaira } from "../lib/rate.jsx";
import { input, primary } from "../lib/ui.js";

const nairaText = (n) => `₦${Number(n).toLocaleString("en-NG")}`;
const Spin = () => <LoaderCircle size={18} className="animate-spin" />;
const Err = ({ text }) => (text ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{text}</p> : null);

export function AddMoneyModal({ onClose, onDone }) {
  const { ready, toUsdcDeposit } = useNaira();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const naira = Number(amount);

  async function pay(e) {
    e.preventDefault();
    if (!naira || naira < 1000) return setError("The minimum is ₦1,000.");
    setError("");
    setStep("processing");
    try {
      await api(ENDPOINTS.deposit, { method: "POST", body: { amount: toUsdcDeposit(naira) } });
      await onDone();
      setStep("done");
    } catch (err) {
      setError(err.message);
      setStep("form");
    }
  }

  if (step === "done") {
    return (
      <Modal title="Money added" onClose={onClose}>
        <div className="py-4 text-center">
          <CircleCheck size={56} className="mx-auto text-emerald-500" />
          <p className="mt-4 font-display text-3xl font-semibold">{nairaText(naira)}</p>
          <p className="mt-1 text-muted">is now in your balance.</p>
          <button onClick={onClose} className={`${primary} mt-6 w-full`}>Done</button>
        </div>
      </Modal>
    );
  }

  const methods = [["bank", "Bank transfer", Landmark], ["card", "Card", CreditCard]];
  return (
    <Modal title="Add money" onClose={onClose}>
      <form onSubmit={pay} className="space-y-5">
        <div>
          <label htmlFor="amt" className="mb-1.5 block text-sm font-medium">Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted">₦</span>
            <input id="amt" className={`${input} pl-9 text-lg font-semibold`} type="number" inputMode="numeric" min="1000" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[5000, 20000, 50000, 100000].map((n) => (
              <button key={n} type="button" onClick={() => setAmount(String(n))} className="rounded-full border border-line px-3.5 py-1.5 text-sm transition hover:border-accent">{nairaText(n)}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Pay with</p>
          <div className="grid grid-cols-2 gap-3">
            {methods.map(([key, label, Icon]) => (
              <button key={key} type="button" onClick={() => setMethod(key)} aria-pressed={method === key} className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left font-semibold transition ${method === key ? "border-accent bg-accent/10" : "border-line hover:border-accent"}`}>
                <Icon size={18} className="text-accent" /> {label}
              </button>
            ))}
          </div>
        </div>
        <Err text={error} />
        <button disabled={step === "processing" || !ready} className={`${primary} w-full`}>
          {step === "processing" ? <><Spin /> Processing…</> : !ready ? "Getting today's rate…" : `Pay ${naira ? nairaText(naira) : ""}`}
        </button>
      </form>
    </Modal>
  );
}

export function JoinModal({ onClose, onJoined }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(ENDPOINTS.join, { method: "POST", body: { code } });
      await onJoined();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Join a circle" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">Enter the 6-character code from the person who invited you.</p>
        <input autoFocus className={`${input} text-center text-2xl font-semibold uppercase tracking-[0.4em]`} maxLength={6} placeholder="ABC123" value={code} onChange={(e) => setCode(e.target.value)} />
        <Err text={error} />
        <button disabled={busy || code.length < 6} className={`${primary} w-full`}>{busy ? <><Spin /> Joining…</> : "Join circle"}</button>
      </form>
    </Modal>
  );
}

const FREQ = { daily: 86400, weekly: 604800, monthly: 2592000, demo5: 300, demo10: 600 };
const WINDOW = { "10m": 10 * 60e3, "1d": 864e5, "3d": 3 * 864e5, "7d": 7 * 864e5 };

export function NewCircleModal({ onClose }) {
  const { toUsdc } = useNaira();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", amount: "", deposit: "", members: "5", freq: "weekly", per: "4", window: "1d" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (Number(f.amount) < 100) return setError("Each payment must be at least ₦100.");
    setBusy(true);
    setError("");
    try {
      const res = await api(ENDPOINTS.circles, {
        method: "POST",
        body: {
          name: f.name.trim(),
          amount: toUsdc(Number(f.amount)),
          deposit: toUsdc(Number(f.deposit || 0)),
          maxMembers: Number(f.members),
          joinDeadline: new Date(Date.now() + WINDOW[f.window]).toISOString(),
          contributionInterval: FREQ[f.freq],
          contributionsPerPayout: Number(f.per),
        },
      });
      navigate(`/app/circles/${res.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const sel = `${input} appearance-none`;
  return (
    <Modal title="New circle" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="mb-1.5 block text-sm font-medium">Circle name</label><input required className={input} value={f.name} onChange={set("name")} placeholder="Market women monthly" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1.5 block text-sm font-medium">Each payment (₦)</label><input required type="number" min="100" inputMode="numeric" className={input} value={f.amount} onChange={set("amount")} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Deposit (₦)</label><input type="number" min="0" inputMode="numeric" className={input} value={f.deposit} onChange={set("deposit")} placeholder="0" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1.5 block text-sm font-medium">Members</label><input required type="number" min="2" max="12" className={input} value={f.members} onChange={set("members")} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Payments per payout</label><input required type="number" min="1" max="31" className={input} value={f.per} onChange={set("per")} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1.5 block text-sm font-medium">Pay every</label>
            <select className={sel} value={f.freq} onChange={set("freq")}><option value="daily">Day</option><option value="weekly">Week</option><option value="monthly">Month</option><option value="demo5">5 minutes (demo)</option><option value="demo10">10 minutes (demo)</option></select></div>
          <div><label className="mb-1.5 block text-sm font-medium">Joining closes in</label>
            <select className={sel} value={f.window} onChange={set("window")}><option value="10m">10 minutes</option><option value="1d">1 day</option><option value="3d">3 days</option><option value="7d">7 days</option></select></div>
        </div>
        <Err text={error} />
        <button disabled={busy} className={`${primary} w-full`}>{busy ? <><Spin /> Creating your circle…</> : <><Banknote size={18} /> Create circle</>}</button>
      </form>
    </Modal>
  );
}
