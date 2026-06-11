// backend/src/routes/store.routes.js
// FASE 3: adicionadas rotas de repasse (payouts) e conexão MP

const express = require("express");
const router  = express.Router();
const { authenticate, requireStore } = require("../middleware/auth");
const ctrl       = require("../controllers/store.controller");
const payoutCtrl = require("../controllers/payout.controller");
const { asyncHandler } = require("../middleware/errorHandler");

router.use(authenticate, requireStore);

// Rotas existentes — INALTERADAS
router.get("/dashboard",           asyncHandler(ctrl.dashboard));
router.get("/products",            asyncHandler(ctrl.listProducts));
router.post("/products",           asyncHandler(ctrl.createProduct));
router.put("/products/:id",        asyncHandler(ctrl.updateProduct));
router.delete("/products/:id",     asyncHandler(ctrl.deleteProduct));
router.get("/orders",              asyncHandler(ctrl.listOrders));
router.put("/orders/:id/status",   asyncHandler(ctrl.updateOrderStatus));
router.get("/profile",             asyncHandler(ctrl.getProfile));
router.put("/profile",             asyncHandler(ctrl.updateProfile));

// FASE 3: repasses e conexão Mercado Pago
router.get("/payouts",             asyncHandler(payoutCtrl.storePayouts));
router.put("/payouts/method",      asyncHandler(payoutCtrl.setPayoutMethod));
router.get("/payouts/mp-connect",  asyncHandler(payoutCtrl.mpConnectUrl));

// Callback OAuth (sem requireStore pois redirect do MP não tem JWT)
// Registrado com o prefixo /store mas precisa de verificação por state
router.get("/payouts/mp-callback", asyncHandler(payoutCtrl.mpCallback));

module.exports = router;
