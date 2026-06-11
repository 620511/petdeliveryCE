// frontend/src/App.jsx
// FIX: componentes auxiliares movidos para fora de AppRoutes (evita re-declaração)
// FIX: Spinner, RoleRedirect, RequireRole agora são módulo-level

import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import LoginPage   from "./pages/Login";
import AdminLayout from "./components/layout/AdminLayout";
import StoreLayout from "./components/layout/StoreLayout";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers     from "./pages/admin/Users";
import AdminStores    from "./pages/admin/Stores";
import AdminOrders    from "./pages/admin/Orders";
import AdminReports   from "./pages/admin/Reports";
import AdminPayouts   from "./pages/admin/Payouts";    // Fase 3
import AdminAssistant from "./pages/admin/Assistant";  // FASE 4

import StoreDashboard from "./pages/store/Dashboard";
import StoreProducts  from "./pages/store/Products";
import StoreOrders    from "./pages/store/Orders";
import StoreProfile   from "./pages/store/Profile";
import StorePayouts   from "./pages/store/Payouts";    // Fase 3
import StoreAssistant   from "./pages/store/Assistant";  // FASE 4
import DeliveryZones   from "./pages/store/DeliveryZones"; // FRETE DINÂMICO

import CustomerApp from "./pages/customer/App";

// ── Spinner global ─────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#FFF8F2", flexDirection: "column", gap: 12,
    }}>
      <div style={{ fontSize: 52 }}>🐾</div>
      <div style={{ fontSize: 14, color: "#999", fontFamily: "sans-serif" }}>Carregando...</div>
    </div>
  );
}

// ── Redireciona para o painel correto conforme role ─────────────────
function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;
  if (user.role === "admin")       return <Navigate to="/admin" replace />;
  if (user.role === "store_owner") return <Navigate to="/store" replace />;
  return <Navigate to="/app" replace />;
}

// ── Guard: exige autenticação + role específico ─────────────────────
function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// ── Rotas da aplicação ──────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Raiz → detecta role e redireciona */}
      <Route path="/" element={<RoleRedirect />} />

      {/* Login (acessível sem auth) */}
      <Route path="/login" element={<LoginPage />} />

      {/* ── ADMIN ──────────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <RequireRole roles={["admin"]}>
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index          element={<AdminDashboard />} />
        <Route path="users"   element={<AdminUsers />} />
        <Route path="stores"  element={<AdminStores />} />
        <Route path="orders"  element={<AdminOrders />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="payouts"    element={<AdminPayouts />} />    {/* Fase 3 */}
        <Route path="assistant"  element={<AdminAssistant />} />  {/* FASE 4 */}
      </Route>

      {/* ── LOJISTA ────────────────────────────────────────── */}
      <Route
        path="/store"
        element={
          <RequireRole roles={["store_owner", "admin"]}>
            <StoreLayout />
          </RequireRole>
        }
      >
        <Route index           element={<StoreDashboard />} />
        <Route path="products" element={<StoreProducts />} />
        <Route path="orders"   element={<StoreOrders />} />
        <Route path="profile"  element={<StoreProfile />} />
        <Route path="payouts"   element={<StorePayouts />} />    {/* Fase 3 */}
        <Route path="assistant"      element={<StoreAssistant />} />  {/* FASE 4 */}
        <Route path="delivery-zones" element={<DeliveryZones />} />   {/* FRETE DINÂMICO */}
      </Route>

      {/* ── CLIENTE ─────────────────────────────────────────── */}
      <Route path="/app/*" element={<CustomerApp />} />

      {/* 404 → redireciona para raiz */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ── Root ────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
