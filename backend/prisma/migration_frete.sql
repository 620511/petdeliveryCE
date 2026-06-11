-- backend/prisma/migration_frete.sql
-- FRETE DINÂMICO: coordenadas GPS na loja + tabela de faixas de entrega
-- Todos os campos nullable — sem breaking change

-- ── Coordenadas GPS da loja ────────────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS lat  DOUBLE PRECISION,  -- latitude geocodificada
  ADD COLUMN IF NOT EXISTS lng  DOUBLE PRECISION;  -- longitude geocodificada

-- ── Faixas de entrega por loja ─────────────────────────────────────
-- Cada loja pode ter N faixas (ex: 0-3km, 3-7km, 7-15km)
CREATE TABLE IF NOT EXISTS delivery_zones (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID            NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  max_km        DOUBLE PRECISION NOT NULL,   -- distância máxima desta faixa (ex: 3.0)
  fee           DOUBLE PRECISION NOT NULL,   -- taxa de entrega nesta faixa (ex: 5.00)
  free_above    DOUBLE PRECISION,            -- frete grátis se subtotal >= este valor (nullable)
  is_active     BOOLEAN          NOT NULL DEFAULT true,
  sort_order    INT              NOT NULL DEFAULT 0,  -- ordem de exibição / verificação
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_store_id ON delivery_zones(store_id);
