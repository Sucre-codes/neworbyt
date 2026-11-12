import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Banknote, Check, Copy, ExternalLink, ListOrdered, LoaderCircle, Play, Sparkles, TriangleAlert, Undo2, UserPlus } from "lucide-react";
import OrderModal from "../components/OrderModal.jsx";
import Logo from "../components/Logo.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import Protected from "../components/Protected.jsx";
import { useTheme } from "../hooks/useTheme.js";
import { useAuth } from "../lib/auth.jsx";
import { api, ENDPOINTS } from "../lib/api.js";
import { useNaira } from "../lib/rate.jsx";
import { card, ghost, primary } from "../lib/ui.js";

const ICONS = { created: Sparkles, joined: UserPlus, started: Play, paid: ArrowUpRight, payout: Banknote, default: TriangleAlert, claimed: Undo2 };

function View() {
  const { id } = useParams();
  const { refresh } = useAuth();
  const { fmt } = useNaira();
  const [dark, toggle] = useTheme();
  const [c, setC] = useState(null);
  const [feed, setFeed] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ text: "", bad: false });
  const [copied, setCopied] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [ordering, setOrdering] = useState(false);

  const load = useCallback(async () => {
    try {
      const [circle, activity] = await Promise.all([api(`${ENDPOINTS.circles}/${id}`), api(`${ENDPOINTS.circles}/${id}/activity`)]);
      setC(circle);
      setFeed(activity);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function act(path, ok) {
    setBusy(path);
    setMsg({ text: "", bad: false });
    try {
      await api(`${ENDPOINTS.circles}/${id}/${path}`, { method: "POST", body: {} });
      setMsg({ text: ok, bad: false });
      await Promise.all([load(), refresh()]);
    } catch (err) {
      setMsg({ text: err.message, bad: true });
    } finally {
      setBusy("");
    }
  }

  const Spin = <LoaderCircle size={18} className="animate-spin" />;
  const toNaira = (text) => text.replace(/([\d.]+) USDC/g, (_, n) => fmt(Number(n)));

  const nav = (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Logo />
        <ThemeToggle dark={dark} onToggle={toggle} />
      </div>
    </header>
  );

  if (error && !c) return <div className="min-h-svh bg-bg text-ink">{nav}<p className="mx-auto max-w-3xl px-5 py-10 text-red-600 dark:text-red-400">{error}</p></div>;
  if (!c) return <div className="min-h-svh bg-bg text-ink">{nav}<p className="mx-auto max-w-3xl px-5 py-10 text-muted">Loading…</p></div>;

  const tiles = [["Each payment", fmt(c.amount)], ["Deposit", fmt(c.deposit)], ["Members", `${c.members} of ${c.maxMembers}`], ["Cycle", c.status === "Open" ? "Not started" : `${Math.min(c.currentCycle, c.members)} of ${c.members}`]];
  const chip = { Open: "bg-accent/15 text-accent", Active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", Completed: "bg-line text-muted" }[c.status];

  return (
    <div className="min-h-svh bg-bg text-ink">
      {nav}
      <main className="mx-auto max-w-3xl space-y-5 px-5 py-8">
        <Link to="/app" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"><ArrowLeft size={16} /> Back</Link>

        <section className={`${card} card-glow`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">{c.name}</h1>
              <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${chip}`}>{c.status}</span>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(c.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold tracking-widest transition hover:border-accent">
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : c.inviteCode}
            </button>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {tiles.map(([k, v]) => (<div key={k}><dt className="text-sm text-muted">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            {c.status === "Open" && c.isOrganizer !== false && <button onClick={() => setOrdering(true)} className={primary}><Play size={18} /> Set order and start</button>}
            {c.status === "Active" && (<>
              <button disabled={!!busy} onClick={() => act("contribute", "Payment received.")} className={primary}>{busy === "contribute" ? Spin : <ArrowUpRight size={18} />} Pay {fmt(c.amount)}</button>
              <button disabled={!!busy} onClick={() => act("settle", "Cycle settled.")} className={ghost}>{busy === "settle" ? Spin : null} Settle cycle</button>
            </>)}
            <button onClick={() => setShowOrder(!showOrder)} aria-expanded={showOrder} className={ghost}><ListOrdered size={18} /> Payout order</button>
            {c.status === "Completed" && <button disabled={!!busy} onClick={() => act("claim", "Deposit returned to your balance.")} className={primary}>{busy === "claim" ? Spin : <Undo2 size={18} />} Claim deposit</button>}
          </div>
          {msg.text && <p role="status" className={`mt-4 text-sm ${msg.bad ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>{msg.text}</p>}
        </section>

        {showOrder && (
          <section className={card}>
            <h2 className="font-semibold">Payout order</h2>
            {(c.order ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted">The order is set when the organizer starts the circle.</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {c.order.map((o) => {
                  const state = c.status === "Completed" || o.position < c.currentCycle ? "Collected" : c.status === "Active" && o.position === c.currentCycle ? "Collecting now" : "";
                  return (
                    <li key={o.position} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${o.you ? "border-accent bg-accent/10" : "border-line"}`}>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-semibold text-accent">{o.position}</span>
                      <span className="flex-1 font-semibold">{o.name}{o.you ? " (you)" : ""}</span>
                      {state && <span className="text-xs font-semibold text-muted">{state}</span>}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        )}

        <section className={card}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Activity</h2>
            <a href={`https://stellar.expert/explorer/testnet/contract/${c.contractId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-semibold text-accent">Verify on explorer <ExternalLink size={14} /></a>
          </div>
          {feed.length === 0 ? <p className="mt-3 text-sm text-muted">Nothing yet.</p> : (
            <ul className="mt-4 space-y-4">
              {feed.map((a) => {
                const Icon = ICONS[a.type] ?? Sparkles;
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent"><Icon size={17} /></span>
                    <div className="min-w-0">
                      <p className="leading-snug">{toNaira(a.message)}</p>
                      <p className="text-xs text-muted">{new Date(a.createdAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      {ordering && <OrderModal circleId={id} onClose={() => setOrdering(false)} onStarted={() => { setOrdering(false); setMsg({ text: "Circle started. The payout order is locked.", bad: false }); load(); }} />}
    </div>
  );
}

export default function Circle() {
  return <Protected><View /></Protected>;
}
