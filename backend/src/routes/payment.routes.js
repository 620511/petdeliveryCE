// backend/src/routes/payment.routes.js
// FASE 3: rotas de pagamento Mercado Pago

const express = require("express");
const router  = express.Router();
const { authenticate, requireCustomer } = require("../middleware/auth");
const ctrl = require("../controllers/payment.controller");
const { asyncHandler } = require("../middleware/errorHandler");

// Webhook: PÚBLICO — MP não envia token, apenas notifica
// IMPORTANTE: deve ser registrado ANTES do middleware de auth
router.post("/webhook", asyncHandler(ctrl.webhook));

// Rotas autenticadas
router.use(authenticate, requireCustomer);

// Criar preferência MP (gera URL de checkout)
router.post("/create", asyncHandler(ctrl.createPayment));

// Verificar status do pagamento (polling de fallback)
router.get("/status/:orderId", asyncHandler(ctrl.getPaymentStatus));

module.exports = router;
