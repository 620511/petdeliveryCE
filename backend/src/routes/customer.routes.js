// backend/src/routes/customer.routes.js
const express = require("express");
const router = express.Router();
const { authenticate, requireCustomer } = require("../middleware/auth");
const ctrl = require("../controllers/customer.controller");
const { asyncHandler } = require("../middleware/errorHandler");

// Rotas públicas (lojas e produtos para browsing)
router.get("/stores",                  asyncHandler(ctrl.listStores));
router.get("/stores/:id/products",     asyncHandler(ctrl.getStoreProducts));
router.get("/categories",              asyncHandler(ctrl.getCategories));

// Rotas autenticadas
router.use(authenticate, requireCustomer);
router.post("/orders",                 asyncHandler(ctrl.createOrder));
router.get("/orders",                  asyncHandler(ctrl.listOrders));
router.get("/orders/:id",              asyncHandler(ctrl.getOrder));
router.get("/addresses",               asyncHandler(ctrl.listAddresses));
router.post("/addresses",              asyncHandler(ctrl.createAddress));
router.get("/profile",                 asyncHandler(ctrl.getProfile));
router.put("/profile",                 asyncHandler(ctrl.updateProfile));

module.exports = router;
