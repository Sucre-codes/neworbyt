import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { RateProvider } from "../lib/rate.jsx";

export default function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-svh place-items-center bg-bg text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <RateProvider>{children}</RateProvider>;
}
