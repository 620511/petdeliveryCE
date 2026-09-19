// frontend/src/services/api.js
// FIX: interceptor de refresh com fila de retry correta
// FIX: remoção de tokens no localStorage ao fazer logout
// FIX: timeout maior (o Render free tier pode demorar até 50s para "acordar")

import axios from "axios";

// Fase 2: baseURL dinâmica — VITE_API_URL em produção, proxy em dev
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: BASE,
  timeout: 60000, // 60s — cobre o "cold start" do Render free tier
  headers: { "Content-Type": "application/json" },
});

// ── Request: injeta accessToken ────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: renova token automaticamente ─────────────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

const clearAuth = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const isTokenExpired =
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED";

    if (isTokenExpired && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing     = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        clearAuth();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post("/api/auth/refresh", { refreshToken });
        localStorage.setItem("accessToken",  data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        api.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuth();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth ───────────────────────────────────────────────────────────
export const authAPI = {
  login:    (data)  => api.post("/auth/login",    data),
  register: (data)  => api.post("/auth/register", data),
  refresh:  (token) => api.post("/auth/refresh",  { refreshToken: token }),
  logout:   (token) => api.post("/auth/logout",   { refreshToken: token }),
  me:       ()      => api.get("/auth/me"),
  changePassword: (d) => api.put("/auth/change-password", d),
};

// ── Privacidade / LGPD ────────────────────────────────────────────
export const privacyAPI = {
  me: () => api.get("/privacy/me"),
  consents: () => api.get("/privacy/consents"),
  updateConsent: (d) => api.put("/privacy/consents", d),
  request: (d) => api.post("/privacy/requests", d),
  export: () => api.post("/privacy/export"),
  adminRequests: () => api.get("/privacy/admin/requests"),
  updateRequest: (id, d) => api.patch(`/privacy/admin/requests/${id}`, d),
  auditLogs: () => api.get("/privacy/admin/audit-logs"),
  incidents: () => api.get("/privacy/admin/incidents"),
  createIncident: (d) => api.post("/privacy/admin/incidents", d),
  updateIncident: (id, d) => api.patch(`/privacy/admin/incidents/${id}`, d),
};

// ── Admin ──────────────────────────────────────────────────────────
export const adminAPI = {
  dashboard:   ()        => api.get("/admin/dashboard"),
  users:       (params)  => api.get("/admin/users",           { params }),
  updateUser:  (id, d)   => api.put(`/admin/users/${id}`,     d),
  deleteUser:  (id)      => api.delete(`/admin/users/${id}`),
  stores:      (params)  => api.get("/admin/stores",          { params }),
  updateStore: (id, d)   => api.put(`/admin/stores/${id}`,    d),
  orders:      (params)  => api.get("/admin/orders",          { params }),
  revenue:     (params)  => api.get("/admin/reports/revenue", { params }),
  // Fase 3
  payouts:     (params)  => api.get("/admin/payouts",           { params }),
  markPaid:    (id, d)   => api.put(`/admin/payouts/${id}/pay`, d),
};

// ── Store ──────────────────────────────────────────────────────────
export const storeAPI = {
  dashboard:       ()         => api.get("/store/dashboard"),
  products:        (params)   => api.get("/store/products",            { params }),
  createProduct:   (d)        => api.post("/store/products",           d),
  updateProduct:   (id, d)    => api.put(`/store/products/${id}`,      d),
  deleteProduct:   (id)       => api.delete(`/store/products/${id}`),
  orders:          (params)   => api.get("/store/orders",              { params }),
  updateStatus:    (id, st)   => api.put(`/store/orders/${id}/status`, { status: st }),
  profile:         ()         => api.get("/store/profile"),
  updateProfile:   (d)        => api.put("/store/profile",             d),
  // Fase 3
  payouts:         ()         => api.get("/store/payouts"),
  setPayoutMethod: (method)   => api.put("/store/payouts/method",      { method }),
  mpConnectUrl:    ()         => api.get("/store/payouts/mp-connect"),
  // Fase 4
  generateDescription: (d)    => api.post("/ai/store/generate-description", d),
  // Frete dinâmico
  deliveryZones:       ()      => api.get("/store/delivery-zones"),
  saveDeliveryZones:   (zones) => api.put("/store/delivery-zones", { zones }),
  geocodeStore:        (addr)  => api.post("/store/geocode", { address: addr }),
};

// ── Customer ───────────────────────────────────────────────────────
export const customerAPI = {
  stores:          (params)        => api.get("/customer/stores",                { params }),
  storeProducts:   (id, p)         => api.get(`/customer/stores/${id}/products`, { params: p }),
  categories:      ()              => api.get("/customer/categories"),
  createOrder:     (d)             => api.post("/customer/orders",               d),
  orders:          ()              => api.get("/customer/orders"),
  order:           (id)            => api.get(`/customer/orders/${id}`),
  addresses:       ()              => api.get("/customer/addresses"),
  addAddress:      (d)             => api.post("/customer/addresses",            d),
  profile:         ()              => api.get("/customer/profile"),
  updateProfile:   (d)             => api.put("/customer/profile",               d),
  // Fase 3
  createPayment:   (orderId)       => api.post("/payment/create",                { order_id: orderId }),
  paymentStatus:   (orderId)       => api.get(`/payment/status/${orderId}`),
  // Frete dinâmico
  calcDeliveryFee: (storeId, body) => api.post(`/stores/${storeId}/delivery-fee`, body),
};

// ── export default para uso direto nos componentes de IA ──────────
export default api;
