import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, LogOut, Plus, TrendingUp, Users, Wallet } from "lucide-react";
import Logo from "../components/Logo.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import Protected from "../components/Protected.jsx";
import { AddMoneyModal, JoinModal, NewCircleModal } from "../components/Modals.jsx";
import { useTheme } from "../hooks/useTheme.js";
import { useAuth } from "../lib/auth.jsx";
import { api, ENDPOINTS } from "../lib/api.js";
import { useNaira } from "../lib/rate.jsx";
import { card, ghost, primary } from "../lib/ui.js";

function Home() {
  const { user, logout, refresh } = useAuth();
  const { fmt } = useNaira();
  const [dark, toggle] = useTheme();
  const [circles, setCircles] = useState(null);
  const [modal, setModal] = useState(null);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    try { setCircles(await api(ENDPOINTS.circles)); } catch { setCircles([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function copy(e, code) {
    e.preventDefault();
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="min-h-svh bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-3">
            <button onClick={logout} className="flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"><LogOut size={16} /> Log out</button>
            <ThemeToggle dark={dark} onToggle={toggle} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <section className={`${card} card-glow flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between`}>
          <div>
            <p className="flex items-center gap-2 text-sm text-muted"><Wallet size={16} className="text-accent" /> Hi {user.name.split(" ")[0]}, your balance</p>
            <p className="mt-2 font-display text-5xl font-semibold tracking-tight sm:text-6xl">{fmt(user.usdcBalance)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setModal("add")} className={primary}><Plus size={18} /> Add money</button>
            <button onClick={() => setModal("new")} className={ghost}><TrendingUp size={18} /> New circle</button>
            <button onClick={() => setModal("join")} className={ghost}><Users size={18} /> Join with code</button>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Your circles</h2>
          {circles === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : circles.length === 0 ? (
            <div className={`${card} text-center`}>
              <Users size={32} className="mx-auto text-accent" />
              <p className="mt-3 font-semibold">No circles yet</p>
              <p className="mt-1 text-sm text-muted">Start one for your group, or join with a code.</p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {circles.map((c) => (
                <li key={c.id}>
                  <Link to={`/app/circles/${c.id}`} className={`${card} block transition hover:border-accent`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="mt-0.5 text-sm text-muted">{fmt(c.amount)} per payment</p>
                      </div>
                      <button onClick={(e) => copy(e, c.inviteCode)} aria-label={`Copy invite code ${c.inviteCode}`} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold tracking-widest transition hover:border-accent">
                        {copied === c.inviteCode ? <Check size={13} /> : <Copy size={13} />} {copied === c.inviteCode ? "Copied" : c.inviteCode}
                      </button>
                    </div>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(c.members / c.maxMembers) * 100}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-muted">{c.members} of {c.maxMembers} members</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {modal === "add" && <AddMoneyModal onClose={() => setModal(null)} onDone={refresh} />}
      {modal === "join" && <JoinModal onClose={() => setModal(null)} onJoined={load} />}
      {modal === "new" && <NewCircleModal onClose={() => setModal(null)} />}
    </div>
  );
}

export default function Dashboard() {
  return <Protected><Home /></Protected>;
}
