// backend/src/routes/auth.routes.js
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const ctrl = require("../controllers/auth.controller");
const { asyncHandler } = require("../middleware/errorHandler");

router.post("/register", asyncHandler(ctrl.register));
router.post("/login",    asyncHandler(ctrl.login));
router.post("/refresh",  asyncHandler(ctrl.refresh));
router.post("/logout",   authenticate, asyncHandler(ctrl.logout));
router.get( "/me",       authenticate, asyncHandler(ctrl.me));
router.put( "/change-password", authenticate, asyncHandler(ctrl.changePassword));

module.exports = router;
