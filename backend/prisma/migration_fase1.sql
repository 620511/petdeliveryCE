-- backend/prisma/migrations/fase1_platform_fee/migration.sql
-- FASE 1: adiciona taxa da plataforma (5%) na tabela de pedidos
-- Campos NULLABLE — pedidos existentes não são afetados (sem breaking change)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS platform_fee DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS store_net    DOUBLE PRECISION;

-- Comentários para documentação
COMMENT ON COLUMN orders.platform_fee IS 'Taxa da plataforma: 5% sobre o subtotal do pedido';
COMMENT ON COLUMN orders.store_net    IS 'Valor líquido para a loja: total - platform_fee';
