// backend/src/routes/upload.routes.js
// Upload de imagens — agora salva no Supabase Storage (permanente, não some no restart do Render)

const express = require("express");
const multer  = require("multer");
const path    = require("path");
const { createClient } = require("@supabase/supabase-js");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

// ── Cliente Supabase (usa a service key — acesso total ao Storage) ─
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = "produtos";

// ── Storage: mantém o arquivo em memória (buffer), não grava em disco ─
const storage = multer.memoryStorage();

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
// Requer autenticação. Sobe o arquivo pro Supabase Storage e retorna { url, filename }
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

    const unique   = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${unique}${path.extname(req.file.originalname).toLowerCase()}`;

    // ── Sobe o buffer direto pro bucket do Supabase ─────────────────
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ error: "Erro ao enviar imagem: " + uploadError.message });
    }

    // ── Pega a URL pública permanente do arquivo ────────────────────
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    res.status(201).json({ url: data.publicUrl, filename, size: req.file.size });
  })
);

// ── DELETE /api/upload/:filename ──────────────────────────────────
router.delete(
  "/:filename",
  authenticate,
  asyncHandler(async (req, res) => {
    const filename = path.basename(req.params.filename); // evita path traversal

    const { error } = await supabase.storage.from(BUCKET).remove([filename]);

    if (error) {
      return res.status(500).json({ error: "Erro ao remover imagem: " + error.message });
    }

    res.json({ message: "Arquivo removido" });
  })
);

module.exports = router;
