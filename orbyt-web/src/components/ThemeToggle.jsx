import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ dark, onToggle }) {
  return (
    <button type="button" onClick={onToggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition hover:border-accent">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
