-- backend/prisma/migrations/fase3_mercadopago/migration.sql
-- FASE 3: pagamentos MP + repasses ao lojista
-- Todos os campos são nullable ou têm DEFAULT — sem breaking change.

-- ── Enums ──────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('pending','approved','rejected','refunded','not_applicable');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayoutMethod" AS ENUM ('mp_split','manual');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('pending','processing','paid','failed');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Adiciona mercadopago ao enum PaymentMethod (se ainda não existir)
DO $$ BEGIN
  ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'mercadopago';
  EXCEPTION WHEN others THEN null;
END $$;

-- ── Tabela orders: novos campos MP ─────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status    "PaymentStatus" NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS mp_payment_id     TEXT,
  ADD COLUMN IF NOT EXISTS mp_preference_id  TEXT,
  ADD COLUMN IF NOT EXISTS mp_checkout_url   TEXT;

-- ── Tabela stores: integração MP do lojista ────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS mp_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS mp_user_id       TEXT,
  ADD COLUMN IF NOT EXISTS payout_method    "PayoutMethod" NOT NULL DEFAULT 'manual';

-- ── Nova tabela payouts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID         NOT NULL REFERENCES stores(id),
  order_id     UUID         NOT NULL UNIQUE REFERENCES orders(id),
  amount       DOUBLE PRECISION NOT NULL,
  method       "PayoutMethod"   NOT NULL,
  status       "PayoutStatus"   NOT NULL DEFAULT 'pending',
  paid_at      TIMESTAMPTZ,
  receipt      TEXT,
  admin_note   TEXT,
  mp_payout_id TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_store_id ON payouts(store_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status   ON payouts(status);
