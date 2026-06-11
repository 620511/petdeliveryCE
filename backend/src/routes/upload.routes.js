// backend/src/routes/upload.routes.js
// Upload de imagens com Multer

const express = require("express");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

// ── Garante que a pasta uploads existe ────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Storage: salva no disco com nome único ────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

// ── Filtro: só imagens ────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error("Apenas imagens JPEG, PNG, WebP ou GIF são aceitas"), { statusCode: 400 }));
  }
};

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "5");

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

// ── POST /api/upload ──────────────────────────────────────────────
// Requer autenticação. Retorna { url, filename }
router.post(
  "/",
  authenticate,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: `Arquivo muito grande. Máximo ${MAX_MB}MB.` });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) return next(err);
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado. Use o campo 'file'." });
    }
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({ url, filename: req.file.filename, size: req.file.size });
  })
);

// ── DELETE /api/upload/:filename ──────────────────────────────────
router.delete(
  "/:filename",
  authenticate,
  asyncHandler(async (req, res) => {
    const filename = path.basename(req.params.filename); // evita path traversal
    const filepath = path.join(UPLOAD_DIR, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }

    fs.unlinkSync(filepath);
    res.json({ message: "Arquivo removido" });
  })
);

module.exports = router;
