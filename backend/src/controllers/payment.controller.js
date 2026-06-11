// backend/src/controllers/payment.controller.js
// FASE 3: integração Mercado Pago — checkout online + webhook de confirmação
//
// Fluxo:
//   1. Cliente escolhe "Pagar Online" no checkout
//   2. POST /api/customer/orders  → cria pedido com paymentMethod: "mercadopago"
//   3. POST /api/payment/create   → cria preferência MP, retorna checkoutUrl
//   4. Cliente paga no site do MP
//   5. MP chama POST /api/payment/webhook  → atualiza paymentStatus do pedido
//   6. Se status "approved" → cria Order com status "confirmed" automaticamente

const prisma = require("../config/database");
const { getIO } = require("../config/socket");

// ── Mercado Pago SDK ───────────────────────────────────────────────
// npm install mercadopago
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const PLATFORM_FEE_RATE = 0.05;

// ── Helpers ────────────────────────────────────────────────────────

// Inicializa o cliente MP com o access token da plataforma
// (para split, cada lojista também tem o seu)
function getMPClient(accessToken) {
  return new MercadoPagoConfig({
    accessToken: accessToken || process.env.MP_ACCESS_TOKEN,
    options: { timeout: 10000 },
  });
}

// POST /api/payment/create
// Body: { order_id }
// Cria uma preferência MP e retorna a URL de checkout
const createPayment = async (req, res) => {
  const { order_id } = req.body;
  if (!order_id) return res.status(400).json({ error: "order_id obrigatório" });

  const order = await prisma.order.findFirst({
    where: { id: order_id, customerId: req.user.id, paymentMethod: "mercadopago" },
    include: {
      items: true,
      store: { select: { name: true, mpAccessToken: true, mpUserId: true, payoutMethod: true } },
    },
  });

  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
  if (order.paymentStatus === "approved")
    return res.status(400).json({ error: "Pedido já pago" });

  // ── Montar itens para o MP ─────────────────────────────────────
  const mpItems = order.items.map((i) => ({
    id:          i.productId || i.id,
    title:       i.productName,
    quantity:    i.quantity,
    unit_price:  Number(i.productPrice),
    currency_id: "BRL",
  }));

  // Frete como item separado (se houver)
  if (order.deliveryFee > 0) {
    mpItems.push({
      id:          "delivery",
      title:       "Taxa de entrega",
      quantity:    1,
      unit_price:  Number(order.deliveryFee),
      currency_id: "BRL",
    });
  }

  const appUrl = process.env.APP_URL || "https://petdelivery.com.br";

  // ── Payload da preferência ─────────────────────────────────────
  const preferencePayload = {
    items: mpItems,
    payer: {
      name:  req.user.name,
      email: req.user.email,
    },
    external_reference: order.id,  // nosso ID — volta no webhook
    notification_url:   `${process.env.API_URL || ""}/api/payment/webhook`,
    back_urls: {
      success: `${appUrl}/?payment=success&order=${order.id}`,
      failure: `${appUrl}/?payment=failure&order=${order.id}`,
      pending: `${appUrl}/?payment=pending&order=${order.id}`,
    },
    auto_return: "approved",
    statement_descriptor: "PetDelivery",
  };

  // ── Opção 1: Split automático (se lojista tem conta MP conectada) ─
  // O marketplace retém os 5% automaticamente
  if (
    order.store.payoutMethod === "mp_split" &&
    order.store.mpAccessToken &&
    order.store.mpUserId
  ) {
    preferencePayload.marketplace       = process.env.MP_APP_ID;
    preferencePayload.marketplace_fee   = Number(order.platformFee || order.subtotal * PLATFORM_FEE_RATE);

    // O access_token usado para criar é o DA PLATAFORMA (conta principal)
    // O lojista recebe direto na conta dele
    // Ref: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/how-tos/integrate-marketplace
  }
  // ── Opção 2: Repasse manual — a plataforma recebe tudo, repassa depois ─
  // Nada diferente na preferência — o payout será criado no webhook

  // ── Criar preferência no MP ────────────────────────────────────
  const client     = getMPClient(process.env.MP_ACCESS_TOKEN);
  const preference = new Preference(client);
  const mpResponse = await preference.create({ body: preferencePayload });

  // ── Atualizar pedido com dados da preferência ──────────────────
  await prisma.order.update({
    where: { id: order.id },
    data: {
      mpPreferenceId: mpResponse.id,
      mpCheckoutUrl:  mpResponse.init_point, // URL do checkout MP
      paymentStatus:  "pending",
    },
  });

  res.json({
    checkout_url:   mpResponse.init_point,
    preference_id:  mpResponse.id,
    // sandbox_url para testes (diferente da init_point de produção)
    sandbox_url:    mpResponse.sandbox_init_point,
  });
};

// POST /api/payment/webhook
// Recebe notificações do Mercado Pago
const webhook = async (req, res) => {
  // MP envia diferentes formatos: IPN (antigo) e Webhooks (novo)
  // Respondemos 200 IMEDIATAMENTE para o MP não retentar
  res.sendStatus(200);

  try {
    const { type, data, action } = req.body;

    // Ignora notificações que não são de pagamento
    if (type !== "payment" && action !== "payment.updated") return;

    const paymentId = data?.id || req.query.id;
    if (!paymentId) return;

    // ── Buscar detalhes do pagamento no MP ─────────────────────────
    const client      = getMPClient(process.env.MP_ACCESS_TOKEN);
    const paymentAPI  = new Payment(client);
    const mpPayment   = await paymentAPI.get({ id: paymentId });

    const orderId = mpPayment.external_reference;
    if (!orderId) return;

    const order = await prisma.order.findUnique({
      where:   { id: orderId },
      include: { store: { select: { id: true, payoutMethod: true } } },
    });
    if (!order) return;

    // ── Mapear status MP → nosso PaymentStatus ─────────────────────
    const statusMap = {
      approved:       "approved",
      rejected:       "rejected",
      cancelled:      "rejected",
      refunded:       "refunded",
      charged_back:   "refunded",
      in_process:     "pending",
      pending:        "pending",
    };
    const newPaymentStatus = statusMap[mpPayment.status] || "pending";

    // ── Atualizar pedido ───────────────────────────────────────────
    const updateData = {
      paymentStatus: newPaymentStatus,
      mpPaymentId:   String(paymentId),
    };

    // Se aprovado: confirmar pedido automaticamente
    if (newPaymentStatus === "approved" && order.status === "pending") {
      updateData.status = "confirmed";
    }

    await prisma.order.update({ where: { id: orderId }, data: updateData });

    // ── Notificar lojista via Socket.io ────────────────────────────
    if (newPaymentStatus === "approved") {
      getIO().to(`store:${order.storeId}`).emit("order:payment_approved", {
        orderId,
        total: order.total,
      });

      // ── Criar registro de payout (pendente de repasse) ─────────
      const payoutAmount = order.storeNet || (order.total - (order.platformFee || order.subtotal * PLATFORM_FEE_RATE));

      await prisma.payout.upsert({
        where:  { orderId },
        update: {},  // já existe — não sobrescreve
        create: {
          storeId: order.storeId,
          orderId,
          amount:  payoutAmount,
          method:  order.store.payoutMethod === "mp_split" ? "mp_split" : "manual",
          status:  order.store.payoutMethod === "mp_split" ? "processing" : "pending",
        },
      });
    }

  } catch (err) {
    // Log sem re-throw — o 200 já foi enviado
    console.error("[payment webhook] erro:", err.message);
  }
};

// GET /api/payment/status/:orderId
// Permite o frontend verificar o status do pagamento por polling (fallback ao webhook)
const getPaymentStatus = async (req, res) => {
  const order = await prisma.order.findFirst({
    where:  { id: req.params.orderId, customerId: req.user.id },
    select: { id: true, status: true, paymentStatus: true, mpPaymentId: true, mpCheckoutUrl: true },
  });
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json(order);
};

module.exports = { createPayment, webhook, getPaymentStatus };
