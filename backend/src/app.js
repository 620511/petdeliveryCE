// backend/src/app.js
require("dotenv").config();
const path    = require("path");
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");
const rateLimit = require("express-rate-limit");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes     = require("./routes/auth.routes");
const adminRoutes    = require("./routes/admin.routes");
const storeRoutes    = require("./routes/store.routes");
const customerRoutes = require("./routes/customer.routes");
const uploadRoutes   = require("./routes/upload.routes");
const paymentRoutes  = require("./routes/payment.routes"); // Fase 3
const aiRoutes       = require("./routes/ai.routes");      // FASE 4
const deliveryRoutes = require("./routes/delivery.routes"); // FRETE DINÂMICO

const app = express();

// ── Segurança ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // permite servir uploads cross-origin
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,https://petdelivery-ce.vercel.app")
  .split(",").map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
app.options("*", cors());

// ── Rate Limiting ──────────────────────────────────────────────────
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  message: { error: "Muitas requisições. Tente em 15 minutos." },
}));
app.use("/api/auth/login",    rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: { error: "Muitas tentativas de login." } }));
app.use("/api/auth/register", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: "Muitos cadastros." } }));

// ── Parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ── Logs ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// ── Arquivos estáticos (uploads) ───────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ── Health Check ───────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    const prisma = require("./config/database");
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected", timestamp: new Date() });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

// ── Rotas API ──────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/store",    storeRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/upload",   uploadRoutes);
app.use("/api/payment",  paymentRoutes); // Fase 3
app.use("/api/ai",       aiRoutes);      // FASE 4
app.use("/api",          deliveryRoutes); // FRETE DINÂMICO

// ── 404 ────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` }));

// ── Error Handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
