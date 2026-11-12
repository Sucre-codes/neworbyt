import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useTheme } from "../hooks/useTheme.js";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input {...props} required className="w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none transition focus:border-accent" />
    </label>
  );
}

function PasswordField({ label, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <span className="relative block">
        <input {...props} type={show ? "text" : "password"} required className="w-full rounded-xl border border-line bg-bg py-3 pl-4 pr-12 outline-none transition focus:border-accent" />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:text-ink">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

export default function Auth({ mode }) {
  const isSignup = mode === "signup";
  const [dark, toggle] = useTheme();
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", identifier: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (user) return <Navigate to="/app" replace />;

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isSignup) await signup({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      else await login(form.identifier, form.password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-bg text-ink">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Logo />
        <ThemeToggle dark={dark} onToggle={toggle} />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-muted">{isSignup ? "It takes a few seconds. We set up your wallet for you." : "Log in with your email or phone number."}</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {isSignup ? (
            <>
              <Field label="Full name" value={form.name} onChange={set("name")} autoComplete="name" />
              <Field label="Email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
              <Field label="Phone number" type="tel" inputMode="numeric" placeholder="08012345678" value={form.phone} onChange={set("phone")} autoComplete="tel" />
            </>
          ) : (
            <Field label="Email or phone number" value={form.identifier} onChange={set("identifier")} autoComplete="username" />
          )}
          <PasswordField label="Password" minLength={isSignup ? 8 : undefined} value={form.password} onChange={set("password")} autoComplete={isSignup ? "new-password" : "current-password"} />
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button disabled={busy} className="w-full rounded-full bg-accent px-6 py-3.5 font-semibold text-accent-ink transition hover:opacity-90 disabled:opacity-60">
            {busy ? (isSignup ? "Setting up your account…" : "Logging in…") : isSignup ? "Create account" : "Log in"}
          </button>
        </form>
        <p className="mt-6 text-sm text-muted">
          {isSignup ? "Already have an account? " : "New to Orbyt? "}
          <Link to={isSignup ? "/login" : "/signup"} className="font-semibold text-accent">{isSignup ? "Log in" : "Create an account"}</Link>
        </p>
      </main>
    </div>
  );
}
