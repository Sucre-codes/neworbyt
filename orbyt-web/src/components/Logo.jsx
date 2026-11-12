import { Link } from "react-router-dom";

export default function Logo({ size = 36 }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Orbyt home">
      <img src="/logo-mark.svg" alt="" width={size} height={size} className="brightness-[0.72] saturate-[1.5] dark:brightness-100 dark:saturate-100" />
      <span className="font-display text-lg font-semibold uppercase tracking-[0.22em]">Orbyt</span>
    </Link>
  );
}
