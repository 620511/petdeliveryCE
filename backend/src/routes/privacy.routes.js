// backend/src/routes/privacy.routes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/privacy.controller");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

router.use(authenticate);

router.get("/me", asyncHandler(ctrl.getMyData));
router.get("/consents", asyncHandler(ctrl.getConsents));
router.put("/consents", asyncHandler(ctrl.updateConsent));
router.post("/requests", asyncHandler(ctrl.requestPrivacyAction));
router.post("/export", asyncHandler(ctrl.exportData));

router.get("/admin/requests", requireAdmin, asyncHandler(ctrl.adminListRequests));
router.patch("/admin/requests/:id", requireAdmin, asyncHandler(ctrl.adminUpdateRequest));
router.get("/admin/audit-logs", requireAdmin, asyncHandler(ctrl.listAuditLogs));
router.get("/admin/incidents", requireAdmin, asyncHandler(ctrl.listIncidents));
router.post("/admin/incidents", requireAdmin, asyncHandler(ctrl.createIncident));
router.patch("/admin/incidents/:id", requireAdmin, asyncHandler(ctrl.updateIncident));

module.exports = router;
