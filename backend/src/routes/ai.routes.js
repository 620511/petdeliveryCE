// backend/src/routes/ai.routes.js
// FASE 4: rotas de IA Gemini — separadas por role

const express = require("express");
const router  = express.Router();
const { authenticate, requireCustomer, requireStore, requireAdmin } = require("../middleware/auth");
const ctrl = require("../controllers/ai.controller");
const { asyncHandler } = require("../middleware/errorHandler");

// ── Cliente ────────────────────────────────────────────────────────
// Chat de atendimento e recomendações
router.post("/chat",            authenticate, requireCustomer, asyncHandler(ctrl.customerChat));
router.post("/recommendations", authenticate, requireCustomer, asyncHandler(ctrl.getRecommendations));

// ── Lojista ────────────────────────────────────────────────────────
router.post("/store/assistant",            authenticate, requireStore,  asyncHandler(ctrl.storeAssistant));
router.post("/store/generate-description", authenticate, requireStore,  asyncHandler(ctrl.generateProductDescription));

// ── Admin ──────────────────────────────────────────────────────────
router.post("/admin/assistant", authenticate, requireAdmin, asyncHandler(ctrl.adminAssistant));

module.exports = router;
