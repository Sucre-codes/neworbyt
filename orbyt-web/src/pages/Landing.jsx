import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import Footer from "../components/Footer.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ParticleBackdrop from "../components/ParticleBackdrop.jsx";
import { useTheme } from "../hooks/useTheme.js";
import { Coins, FileCheck, Landmark, Layers, Lock, RefreshCw, ShieldCheck, TrendingUp, UserPlus, Users, Zap, CirclePlus } from "lucide-react";

const steps = [
  [CirclePlus, "Create a circle", "Set the contribution, the payment interval and the number of members, then share the invite code."],
  [UserPlus, "Members join", "Each member joins with the code and locks a deposit that protects the pool."],
  [Landmark, "Contributions pool on-chain", "Payments go into the circle's smart contract, never to an individual."],
  [RefreshCw, "Payouts rotate automatically", "When a cycle completes, the contract pays that cycle's member. After the last cycle, deposits are returned."],
];

const protections = [
  [Lock, "Custody by code", "No organizer or operator can move the pool. Only the contract's rules can."],
  [ShieldCheck, "Default protection", "Deposits cover missed contributions so every cycle still completes."],
  [FileCheck, "Public audit trail", "Every contribution and payout is recorded on the Stellar ledger and can be verified by anyone."],
  [Zap, "Fast, low-fee settlement", "Transactions confirm in seconds for a fraction of a cent."],
];

// Placeholder figures for the landing page. Replace with real numbers when you have them.
const METRICS = [
  [Coins, "Total value", "$1.28M"],
  [Layers, "Active pools", "312"],
  [RefreshCw, "Completed cycles", "4,860"],
  [TrendingUp, "Average payout", "$3,950"],
];

const Badge = ({ icon: Icon }) => (
  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Icon size={20} /></span>
);

export default function Landing() {
  const [dark, toggleTheme] = useTheme();

  return (
    <div className="min-h-svh bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="hidden px-3 text-sm font-semibold text-muted transition hover:text-ink sm:block">Log in</Link>
            <Link to="/signup" className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:opacity-90">Get started</Link>
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10"><ParticleBackdrop dark={dark} /></div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-bg/10 via-bg/55 to-bg md:bg-gradient-to-r md:from-bg md:via-bg/60 md:to-transparent" />
          <div className="mx-auto flex min-h-[86svh] max-w-6xl flex-col justify-center px-5 py-16">
            <h1 className="max-w-2xl font-display text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
              Automated rotating savings, <span className="gold-text">on chain.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Orbyt pools every contribution in a Stellar smart contract, rotates the payout on schedule, and records each transaction on a public ledger.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className="rounded-full bg-accent px-6 py-3.5 text-center font-semibold text-accent-ink transition hover:opacity-90">Launch app</Link>
              <a href="#how" className="rounded-full border border-line px-6 py-3.5 text-center font-semibold transition hover:border-accent">How it works</a>
            </div>
            <dl className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4">
              {METRICS.map(([Icon, label, value]) => (
                <div key={label} className="rounded-2xl border border-line bg-surface/40 p-4 backdrop-blur-md sm:p-5">
                  <Icon size={18} className="text-accent" />
                  <dt className="mt-3 text-sm text-muted">{label}</dt>
                  <dd className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <h2 className="max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">How a circle <span className="gold-text">works</span></h2>
          <ol className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {steps.map(([Icon, title, text]) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-accent">
                <Badge icon={Icon} />
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 max-w-md leading-relaxed text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">Protections built into the contract</h2>
            <dl className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
              {protections.map(([Icon, title, text]) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-line bg-bg p-5">
                  <Badge icon={Icon} />
                  <div><dt className="font-semibold">{title}</dt><dd className="mt-1.5 max-w-md leading-relaxed text-muted">{text}</dd></div>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
