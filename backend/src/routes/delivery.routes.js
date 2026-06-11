// backend/src/routes/delivery.routes.js
// FRETE DINÂMICO: rotas públicas (cálculo) e protegidas (lojista)

const express = require("express");
const router  = express.Router();
const { authenticate, requireCustomer, requireStore } = require("../middleware/auth");
const ctrl = require("../controllers/delivery.controller");
const { asyncHandler } = require("../middleware/errorHandler");

// ── Público / Cliente: calcular frete para um endereço ────────────
// Usado no carrinho antes de finalizar o pedido
router.post(
  "/stores/:storeId/delivery-fee",
  authenticate, requireCustomer,
  asyncHandler(ctrl.calculateFee)
);

// ── Lojista: gerenciar faixas de entrega ──────────────────────────
router.get( "/store/delivery-zones",  authenticate, requireStore, asyncHandler(ctrl.listZones));
router.put( "/store/delivery-zones",  authenticate, requireStore, asyncHandler(ctrl.saveZones));
router.post("/store/geocode",         authenticate, requireStore, asyncHandler(ctrl.geocodeStore));

module.exports = router;
