import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ENDPOINTS, getToken, setToken } from "./api.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const refresh = useCallback(async () => {
    try {
      setUser(await api(ENDPOINTS.me));
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (getToken()) refresh(); }, [refresh]);

  async function login(identifier, password) {
    const { token } = await api(ENDPOINTS.login, { method: "POST", body: { identifier, password } });
    setToken(token);
    await refresh();
  }
  async function signup(form) {
    const { token } = await api(ENDPOINTS.signup, { method: "POST", body: form });
    setToken(token);
    await refresh();
  }
  function logout() { setToken(null); setUser(null); }

  return <Ctx.Provider value={{ user, loading, login, signup, logout, refresh }}>{children}</Ctx.Provider>;
}
