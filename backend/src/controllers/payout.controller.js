// backend/src/controllers/payout.controller.js
// FASE 3: repasse ao lojista — Opção 1 (MP split) e Opção 2 (manual pelo admin)

const prisma = require("../config/database");

// ──────────────────────────────────────────────────────────────────
// ADMIN: listar todos os repasses pendentes / histórico
// GET /api/admin/payouts?status=pending&store_id=xxx
// ──────────────────────────────────────────────────────────────────
const listPayouts = async (req, res) => {
  const { status, store_id, page = 1, limit = 30 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    ...(status   && { status }),
    ...(store_id && { storeId: store_id }),
  };

  const [payouts, total] = await Promise.all([
    prisma.payout.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        store: { select: { id: true, name: true, logoUrl: true } },
        order: {
          select: {
            id: true, total: true, subtotal: true,
            platformFee: true, storeNet: true,
            createdAt: true, deliveredAt: true,
            customer: { select: { name: true } },
          },
        },
      },
    }),
    prisma.payout.count({ where }),
  ]);

  // Totais por status para o painel
  const [pendingSum, paidSum] = await Promise.all([
    prisma.payout.aggregate({ where: { status: "pending"  }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { status: "paid"     }, _sum: { amount: true } }),
  ]);

  res.json({
    payouts: payouts.map((p) => ({
      id:          p.id,
      store_id:    p.storeId,
      store_name:  p.store.name,
      store_logo:  p.store.logoUrl,
      order_id:    p.orderId,
      order_total: p.order.total,
      amount:      p.amount,
      method:      p.method,
      status:      p.status,
      paid_at:     p.paidAt,
      receipt:     p.receipt,
      admin_note:  p.adminNote,
      order_date:  p.order.createdAt,
      customer:    p.order.customer.name,
    })),
    total,
    summary: {
      pending_amount: pendingSum._sum.amount || 0,
      paid_amount:    paidSum._sum.amount    || 0,
    },
  });
};

// ──────────────────────────────────────────────────────────────────
// ADMIN: marcar repasse manual como pago
// PUT /api/admin/payouts/:id/pay
// Body: { receipt, admin_note }
// ──────────────────────────────────────────────────────────────────
const markAsPaid = async (req, res) => {
  const { receipt, admin_note } = req.body;
  const { id } = req.params;

  const payout = await prisma.payout.findUnique({ where: { id } });
  if (!payout)
    return res.status(404).json({ error: "Repasse não encontrado" });
  if (payout.status === "paid")
    return res.status(400).json({ error: "Repasse já marcado como pago" });

  const updated = await prisma.payout.update({
    where: { id },
    data: {
      status:    "paid",
      paidAt:    new Date(),
      receipt:   receipt   || null,
      adminNote: admin_note || null,
    },
    include: { store: { select: { name: true } } },
  });

  res.json({
    id:         updated.id,
    status:     updated.status,
    paid_at:    updated.paidAt,
    store_name: updated.store.name,
    amount:     updated.amount,
  });
};

// ──────────────────────────────────────────────────────────────────
// STORE: ver saldo e histórico de repasses da própria loja
// GET /api/store/payouts
// ──────────────────────────────────────────────────────────────────
const storePayouts = async (req, res) => {
  const store = await prisma.store.findUnique({ where: { ownerId: req.user.id } });
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  const [payouts, pendingAgg, paidAgg] = await Promise.all([
    prisma.payout.findMany({
      where:   { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        order: {
          select: {
            id: true, total: true, subtotal: true,
            platformFee: true, createdAt: true,
            customer: { select: { name: true } },
          },
        },
      },
    }),
    prisma.payout.aggregate({ where: { storeId: store.id, status: "pending"  }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { storeId: store.id, status: "paid"     }, _sum: { amount: true } }),
  ]);

  res.json({
    payout_method:  store.payoutMethod,
    mp_connected:   !!store.mpAccessToken,
    balance: {
      pending: pendingAgg._sum.amount || 0,  // aguardando repasse
      paid:    paidAgg._sum.amount    || 0,  // já recebido
    },
    payouts: payouts.map((p) => ({
      id:           p.id,
      order_id:     p.orderId,
      order_total:  p.order.total,
      platform_fee: p.order.platformFee,
      amount:       p.amount,        // valor líquido recebido
      method:       p.method,
      status:       p.status,
      paid_at:      p.paidAt,
      receipt:      p.receipt,
      order_date:   p.order.createdAt,
      customer:     p.order.customer.name,
    })),
  });
};

// ──────────────────────────────────────────────────────────────────
// STORE: escolher método de repasse (MP split ou manual)
// PUT /api/store/payouts/method
// Body: { method: "mp_split" | "manual" }
// ──────────────────────────────────────────────────────────────────
const setPayoutMethod = async (req, res) => {
  const { method } = req.body;
  if (!["mp_split", "manual"].includes(method))
    return res.status(400).json({ error: "Método inválido. Use: mp_split ou manual" });

  const store = await prisma.store.findUnique({ where: { ownerId: req.user.id } });
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  // Para usar mp_split, o lojista precisa ter conectado a conta MP
  if (method === "mp_split" && !store.mpAccessToken)
    return res.status(400).json({
      error: "Conecte sua conta Mercado Pago antes de ativar o split automático",
      action: "connect_mp",
    });

  await prisma.store.update({
    where: { id: store.id },
    data:  { payoutMethod: method },
  });

  res.json({ payout_method: method, message: "Método de repasse atualizado com sucesso" });
};

// ──────────────────────────────────────────────────────────────────
// STORE: iniciar OAuth MP (conectar conta do lojista)
// GET /api/store/payouts/mp-connect
// ──────────────────────────────────────────────────────────────────
const mpConnectUrl = async (req, res) => {
  const store = await prisma.store.findUnique({ where: { ownerId: req.user.id } });
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  // URL OAuth do Mercado Pago Marketplace
  // Ref: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/how-tos/integrate-marketplace
  const appId       = process.env.MP_APP_ID;
  const redirectUri = encodeURIComponent(`${process.env.API_URL}/api/store/payouts/mp-callback`);
  const state       = store.id; // passamos o store_id como state para identificar no callback

  const url = `https://auth.mercadopago.com.br/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${redirectUri}`;

  res.json({ url });
};

// ──────────────────────────────────────────────────────────────────
// STORE: callback OAuth MP — salva access_token do lojista
// GET /api/store/payouts/mp-callback?code=xxx&state=store_id
// ──────────────────────────────────────────────────────────────────
const mpCallback = async (req, res) => {
  const { code, state: storeId } = req.query;
  if (!code || !storeId)
    return res.status(400).json({ error: "Parâmetros inválidos no callback" });

  // Trocar code por access_token
  const tokenRes = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_secret: process.env.MP_SECRET_KEY,
      client_id:     process.env.MP_APP_ID,
      grant_type:    "authorization_code",
      code,
      redirect_uri:  `${process.env.API_URL}/api/store/payouts/mp-callback`,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json();
    console.error("[MP OAuth] erro:", err);
    return res.status(400).json({ error: "Falha ao conectar conta Mercado Pago" });
  }

  const tokenData = await tokenRes.json();

  await prisma.store.update({
    where: { id: storeId },
    data: {
      mpAccessToken: tokenData.access_token,
      mpUserId:      String(tokenData.user_id),
    },
  });

  // Redireciona para o painel da loja com mensagem de sucesso
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  res.redirect(`${frontendUrl}/store?mp_connected=true`);
};

module.exports = {
  listPayouts,
  markAsPaid,
  storePayouts,
  setPayoutMethod,
  mpConnectUrl,
  mpCallback,
};
