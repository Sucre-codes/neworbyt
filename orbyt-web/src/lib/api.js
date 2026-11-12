const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

// If a route name differs in your backend, change it here and nowhere else.
export const ENDPOINTS = {
  signup: "/auth/signup",
  login: "/auth/login",
  me: "/users/me",
  deposit: "/users/me/deposit",
  circles: "/circles",
  join: "/circles/join",
  stats: "/stats",
};

export const getToken = () => {
  try { return localStorage.getItem("orbyt-token"); } catch { return null; }
};
export function setToken(t) {
  try { t ? localStorage.setItem("orbyt-token", t) : localStorage.removeItem("orbyt-token"); } catch {}
}

export async function api(path, { method = "GET", body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
