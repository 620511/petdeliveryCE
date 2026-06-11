// frontend/src/contexts/AuthContext.jsx
// FIX: logout limpa tokens antes de chamar API (evita loop se token expirado)
// FIX: tratamento de erro no rehydrate inicial

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Recarrega sessão do token salvo no localStorage
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { setLoading(false); return; }

    authAPI.me()
      .then(({ data }) => setUser(data))
      .catch(() => {
        // Token inválido ou expirado sem possibilidade de refresh
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem("accessToken",  data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authAPI.register(payload);
    localStorage.setItem("accessToken",  data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  // FIX: remove tokens ANTES de chamar API para evitar loop de retry
  const logout = useCallback(async () => {
    const rt = localStorage.getItem("refreshToken");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    if (rt) {
      try { await authAPI.logout(rt); } catch { /* silencioso */ }
    }
  }, []);

  const value = {
    user, loading, login, register, logout,
    isAdmin:    user?.role === "admin",
    isStore:    user?.role === "store_owner",
    isCustomer: user?.role === "customer",
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
