// backend/src/routes/admin.routes.js
// FASE 3: adicionadas rotas de repasse (payouts)

const express = require("express");
const router  = express.Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const ctrl        = require("../controllers/admin.controller");
const payoutCtrl  = require("../controllers/payout.controller");
const { asyncHandler } = require("../middleware/errorHandler");

router.use(authenticate, requireAdmin);

// Rotas existentes — INALTERADAS
router.get("/dashboard",        asyncHandler(ctrl.dashboard));
router.get("/users",            asyncHandler(ctrl.listUsers));
router.put("/users/:id",        asyncHandler(ctrl.updateUser));
router.delete("/users/:id",     asyncHandler(ctrl.deleteUser));
router.get("/stores",           asyncHandler(ctrl.listStores));
router.put("/stores/:id",       asyncHandler(ctrl.updateStore));
router.get("/orders",           asyncHandler(ctrl.listOrders));
router.get("/reports/revenue",  asyncHandler(ctrl.revenueReport));

// FASE 3: repasses ao lojista
router.get("/payouts",          asyncHandler(payoutCtrl.listPayouts));
router.put("/payouts/:id/pay",  asyncHandler(payoutCtrl.markAsPaid));

module.exports = router;
