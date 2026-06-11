# 🐾 PetDelivery — Projeto Completo

## Features implementadas

| Fase | Feature | Status |
|------|---------|--------|
| 1 | Fix imagem produto (vertical/horizontal) | ✅ |
| 1 | Taxa 5% da plataforma por venda | ✅ |
| 2 | PWA — instalar no celular (Android + iOS) | ✅ |
| 2 | Deploy Railway (backend + frontend) | ✅ |
| 2 | Domínio customizado | ✅ |
| 3 | Mercado Pago — pagamento online | ✅ |
| 3 | Repasse lojista — Split automático MP | ✅ |
| 3 | Repasse lojista — Manual pelo admin | ✅ |
| 4 | IA Gemini — Chat atendimento ao cliente | ✅ |
| 4 | IA Gemini — Recomendação de produtos | ✅ |
| 4 | IA Gemini — Assistente do lojista | ✅ |
| 4 | IA Gemini — Assistente do admin | ✅ |
| 4 | IA Gemini — Gerar descrição de produto | ✅ |

---

## Setup local

### Backend
```bash
cd backend && npm install
```

Adicione no `.env`:
```
MP_ACCESS_TOKEN=TEST-sua-chave
MP_APP_ID=seu-app-id
MP_SECRET_KEY=sua-secret-key
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:5173
GEMINI_API_KEY=AIzaSy-sua-chave
```

Migrations:
```bash
# No SQL Editor do Supabase, execute em ordem:
# 1. prisma/migration_fase1.sql
# 2. prisma/migration_fase3.sql

npx prisma generate
npm run dev
```

### Frontend
```bash
cd frontend && npm install && npm run dev
```

Ícones PWA — coloque em `public/icons/`:
- `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
- Gere em: https://www.pwabuilder.com/imageGenerator

---

## Deploy Railway

### Variáveis do Backend
```
NODE_ENV=production
DATABASE_URL / DIRECT_URL / JWT_SECRET / JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m / JWT_REFRESH_EXPIRES_IN=7d
ALLOWED_ORIGINS=https://SEU_FRONTEND.up.railway.app
MP_ACCESS_TOKEN / MP_APP_ID / MP_SECRET_KEY
API_URL=https://SEU_BACKEND.up.railway.app
FRONTEND_URL / APP_URL=https://SEU_FRONTEND.up.railway.app
GEMINI_API_KEY=sua-chave
```

### Variáveis do Frontend
```
VITE_API_URL=https://SEU_BACKEND.up.railway.app
VITE_APP_URL=https://SEU_FRONTEND.up.railway.app
```

### Domínio
- Railway → Settings → Networking → Custom Domain
- Frontend: CNAME `petdelivery.com.br` → `xxx.up.railway.app`
- Backend: CNAME `api.petdelivery.com.br` → `yyy.up.railway.app`
- SSL automático ✅

### Webhook MP
Painel MP → Webhooks → `https://api.petdelivery.com.br/api/payment/webhook`

---

## Chaves necessárias
| Serviço | Onde obter |
|---------|-----------|
| Mercado Pago | developers.mercadopago.com |
| Gemini | aistudio.google.com/app/apikey (gratuito: 15 req/min) |
