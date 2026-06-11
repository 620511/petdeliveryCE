// backend/src/controllers/ai.controller.js
// FASE 4: IA com Gemini Google

const prisma = require("../config/database");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const recommendationCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");
  return new GoogleGenerativeAI(key);
}

// Helper com retry e tratamento de rate limit (429)
async function callGemini(prompt, systemInstruction, maxTokens = 1024) {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",   // ← modelo atualizado
    systemInstruction,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  });

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    // Rate limit — retorna mensagem amigável em vez de derrubar a tela
    if (err?.status === 429 || err?.message?.includes("429")) {
      return "⏳ Assistente temporariamente ocupado. Tente novamente em alguns segundos.";
    }
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────
// 1. ATENDIMENTO AO CLIENTE
// ──────────────────────────────────────────────────────────────────
const customerChat = async (req, res) => {
  try {
    const { store_id, message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Mensagem vazia" });

    const [store, products, orders] = await Promise.all([
      store_id ? prisma.store.findUnique({
        where: { id: store_id },
        select: { name: true, deliveryTimeMin: true, deliveryTimeMax: true, deliveryFee: true, minOrderValue: true, isOpen: true },
      }) : null,
      store_id ? prisma.product.findMany({
        where: { storeId: store_id, isActive: true, stock: { gt: 0 } },
        select: { name: true, price: true, description: true, emoji: true, badge: true },
        take: 30, orderBy: { rating: "desc" },
      }) : [],
      prisma.order.findMany({
        where: { customerId: req.user.id },
        select: { id: true, status: true, total: true, createdAt: true,
          store: { select: { name: true } },
          items: { select: { productName: true, quantity: true } },
        },
        orderBy: { createdAt: "desc" }, take: 5,
      }),
    ]);

    const storeCtx = store
      ? `Loja: ${store.name} | Aberta: ${store.isOpen ? "Sim" : "Não"} | Entrega: ${store.deliveryTimeMin}-${store.deliveryTimeMax} min | Taxa: R$ ${store.deliveryFee} | Mínimo: R$ ${store.minOrderValue}`
      : "Cliente não está em nenhuma loja específica.";

    const productsCtx = products.length
      ? `Produtos disponíveis:\n${products.map(p => `- ${p.emoji || ""} ${p.name} (R$ ${p.price.toFixed(2)})${p.badge ? " ["+p.badge+"]" : ""}${p.description ? " — " + p.description.slice(0, 60) : ""}`).join("\n")}`
      : "";

    const ordersCtx = orders.length
      ? `Últimos pedidos:\n${orders.map(o => `- Pedido #${o.id.slice(-6)} na ${o.store.name} | Status: ${o.status} | R$ ${o.total.toFixed(2)}`).join("\n")}`
      : "Cliente não tem pedidos anteriores.";

    const systemInstruction = `Você é o assistente virtual do PetDelivery. Seja simpático e objetivo. Responda em português brasileiro com emojis moderados.\n\n${storeCtx}\n${productsCtx}\n${ordersCtx}`;

    const historyText = history.slice(-6)
      .map(h => `${h.role === "user" ? "Cliente" : "Assistente"}: ${h.text}`)
      .join("\n");

    const fullPrompt = historyText ? `${historyText}\nCliente: ${message}` : message;
    const reply = await callGemini(fullPrompt, systemInstruction, 512);
    res.json({ reply, timestamp: new Date() });
  } catch (err) {
    console.error("customerChat error:", err);
    res.status(500).json({ error: "Erro no assistente. Tente novamente." });
  }
};

// ──────────────────────────────────────────────────────────────────
// 2. RECOMENDAÇÃO DE PRODUTOS
// ──────────────────────────────────────────────────────────────────
const getRecommendations = async (req, res) => {
  try {
    const { store_id, current_product_id, cart_items = [] } = req.body;
    if (!store_id) return res.status(400).json({ error: "store_id obrigatório" });

    const cacheKey = `${store_id}:${current_product_id || "none"}:${cart_items.map(i=>i.name).join(",")}`;
    const cached = recommendationCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json({ recommendations: cached.data, cached: true });
    }

    const [products, orderHistory] = await Promise.all([
      prisma.product.findMany({
        where: { storeId: store_id, isActive: true, stock: { gt: 0 } },
        select: { id: true, name: true, price: true, emoji: true, badge: true, categoryId: true, description: true },
        orderBy: { rating: "desc" }, take: 40,
      }),
      prisma.order.findMany({
        where: { customerId: req.user.id, storeId: store_id },
        select: { items: { select: { productName: true } } },
        orderBy: { createdAt: "desc" }, take: 10,
      }),
    ]);

    if (products.length < 2) return res.json({ recommendations: [] });

    const currentProduct = current_product_id ? products.find(p => p.id === current_product_id) : null;
    const boughtBefore = [...new Set(orderHistory.flatMap(o => o.items.map(i => i.productName)))];
    const cartNames = cart_items.map(i => i.name).join(", ") || "nenhum";

    const prompt = `Sistema de recomendação de pet shop.\nProduto atual: ${currentProduct ? currentProduct.name : "nenhum"}\nCarrinho: ${cartNames}\nJá comprou: ${boughtBefore.join(", ") || "nenhum"}\n\nCatálogo:\n${products.map(p => `ID:${p.id} | ${p.emoji||""} ${p.name} | R$ ${p.price.toFixed(2)}`).join("\n")}\n\nRetorne JSON válido sem markdown:\n{"recommendations":[{"id":"UUID","reason":"motivo curto"}]}\nMáximo 4 itens. Não inclua produto atual nem itens do carrinho.`;

    const raw = await callGemini(prompt, "", 512);

    let recommendations = [];
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      // Se retornou mensagem de rate limit, retorna vazio sem erro
      if (!clean.startsWith("{")) return res.json({ recommendations: [] });
      const parsed = JSON.parse(clean);
      const validIds = new Set(products.map(p => p.id));
      recommendations = (parsed.recommendations || [])
        .filter(r => validIds.has(r.id))
        .map(r => {
          const p = products.find(p => p.id === r.id);
          return { id: p.id, name: p.name, price: p.price, emoji: p.emoji, badge: p.badge, reason: r.reason };
        })
        .slice(0, 4);
    } catch {
      recommendations = [];
    }

    recommendationCache.set(cacheKey, { data: recommendations, ts: Date.now() });
    res.json({ recommendations, cached: false });
  } catch (err) {
    console.error("getRecommendations error:", err);
    // Retorna vazio em vez de 500 para não derrubar a tela do cliente
    res.json({ recommendations: [] });
  }
};

// ──────────────────────────────────────────────────────────────────
// 3. ASSISTENTE DO LOJISTA
// ──────────────────────────────────────────────────────────────────
const storeAssistant = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Mensagem vazia" });

    const store = await prisma.store.findUnique({ where: { ownerId: req.user.id } });
    if (!store) return res.status(404).json({ error: "Loja não encontrada" });

    const [stats, topProducts, recentOrders, hourlyOrders] = await Promise.all([
      Promise.all([
        prisma.product.count({ where: { storeId: store.id, isActive: true } }),
        prisma.order.count({ where: { storeId: store.id } }),
        prisma.order.aggregate({ where: { storeId: store.id, status: "delivered" }, _sum: { total: true } }),
        prisma.order.count({ where: { storeId: store.id, status: { in: ["pending","confirmed","preparing"] } } }),
      ]),
      prisma.$queryRaw`
        SELECT p.name, p.emoji, p.price::float, SUM(oi.quantity)::int AS sold,
               SUM(oi.total)::float AS revenue
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o   ON o.id = oi.order_id
        WHERE o.store_id = ${store.id} AND o.status = 'delivered'
          AND o.created_at > NOW() - INTERVAL '30 days'
        GROUP BY p.id, p.name, p.emoji, p.price
        ORDER BY sold DESC LIMIT 10
      `,
      prisma.order.findMany({
        where: { storeId: store.id },
        select: { status: true, total: true, createdAt: true, paymentMethod: true },
        orderBy: { createdAt: "desc" }, take: 50,
      }),
      prisma.$queryRaw`
        SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS count
        FROM orders WHERE store_id = ${store.id}
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY hour ORDER BY count DESC LIMIT 5
      `,
    ]);

    const [prodCount, ordCount, revAgg, pendingCount] = stats;
    const revenue = revAgg._sum.total || 0;
    const cancelledCount = recentOrders.filter(o => o.status === "cancelled").length;
    const paymentMethods = recentOrders.reduce((acc, o) => {
      acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + 1;
      return acc;
    }, {});

    const systemInstruction = `Você é o assistente de negócios do lojista no PetDelivery. Ajude "${store.name}" com análises e sugestões. Português brasileiro, use emojis.\n\nDados (30 dias): Produtos: ${prodCount} | Pedidos: ${ordCount} | Receita: R$ ${revenue.toFixed(2)} | Pendentes: ${pendingCount} | Cancelados: ${cancelledCount}\nHorários de pico: ${hourlyOrders.map(h => `${h.hour}h (${h.count})`).join(", ") || "sem dados"}\nPagamentos: ${Object.entries(paymentMethods).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k}: ${v}`).join(", ") || "sem dados"}\nTop produtos: ${topProducts.slice(0,5).map(p => `${p.name}: ${p.sold} vendidos`).join(" | ") || "sem vendas"}`;

    const historyText = history.slice(-8).map(h => `${h.role === "user" ? "Lojista" : "Assistente"}: ${h.text}`).join("\n");
    const fullPrompt = historyText ? `${historyText}\nLojista: ${message}` : message;
    const reply = await callGemini(fullPrompt, systemInstruction, 768);
    res.json({ reply, timestamp: new Date() });
  } catch (err) {
    console.error("storeAssistant error:", err);
    res.status(500).json({ error: "Erro no assistente. Tente novamente." });
  }
};

// ──────────────────────────────────────────────────────────────────
// 4. ASSISTENTE DO ADMIN
// ──────────────────────────────────────────────────────────────────
const adminAssistant = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Mensagem vazia" });

    const [globalStats, topStores, recentIssues, weeklyRevenue] = await Promise.all([
      Promise.all([
        prisma.user.count({ where: { role: "customer", isActive: true } }),
        prisma.user.count({ where: { role: "store_owner", isActive: true } }),
        prisma.store.count({ where: { isActive: true } }),
        prisma.order.count(),
        prisma.order.aggregate({ where: { status: "delivered" }, _sum: { total: true, platformFee: true } }),
        prisma.order.count({ where: { status: "cancelled" } }),
      ]),
      prisma.$queryRaw`
        SELECT s.name, COUNT(o.id)::int AS orders, SUM(o.total)::float AS revenue, AVG(s.rating)::float AS rating
        FROM stores s LEFT JOIN orders o ON o.store_id = s.id AND o.status = 'delivered'
        WHERE s.is_active = true GROUP BY s.id, s.name ORDER BY revenue DESC NULLS LAST LIMIT 10
      `,
      prisma.order.findMany({
        where: { status: "cancelled", createdAt: { gte: new Date(Date.now() - 7*24*60*60*1000) } },
        select: { id: true, createdAt: true, store: { select: { name: true } } },
        orderBy: { createdAt: "desc" }, take: 20,
      }),
      prisma.$queryRaw`
        SELECT DATE(created_at)::text AS date, SUM(total)::float AS revenue, SUM(platform_fee)::float AS fees, COUNT(*)::int AS orders
        FROM orders WHERE status = 'delivered' AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at) ORDER BY date
      `,
    ]);

    const [customers, storeOwners, activeStores, totalOrders, revAgg, cancelledOrders] = globalStats;
    const totalRevenue = revAgg._sum.total || 0;
    const totalFees = revAgg._sum.platformFee || 0;
    const cancelByStore = recentIssues.reduce((acc, o) => { acc[o.store.name] = (acc[o.store.name] || 0) + 1; return acc; }, {});

    const systemInstruction = `Você é o assistente de gestão da plataforma PetDelivery. Analise dados e sugira ações estratégicas. Português brasileiro.\n\nPlataforma: Clientes: ${customers} | Lojistas: ${storeOwners} | Lojas ativas: ${activeStores} | Pedidos: ${totalOrders} | Receita: R$ ${totalRevenue.toFixed(2)} | Taxas: R$ ${totalFees.toFixed(2)} | Cancelamentos: ${cancelledOrders}\nReceita 7 dias: ${weeklyRevenue.map(d => `${d.date}: R$ ${Number(d.revenue||0).toFixed(2)} (${d.orders} pedidos)`).join(" | ") || "sem dados"}\nTop lojas: ${topStores.slice(0,5).map(s => `${s.name}: R$ ${Number(s.revenue||0).toFixed(2)}`).join(" | ") || "sem dados"}`;

    const historyText = history.slice(-8).map(h => `${h.role === "user" ? "Admin" : "Assistente"}: ${h.text}`).join("\n");
    const fullPrompt = historyText ? `${historyText}\nAdmin: ${message}` : message;
    const reply = await callGemini(fullPrompt, systemInstruction, 1024);
    res.json({ reply, timestamp: new Date() });
  } catch (err) {
    console.error("adminAssistant error:", err);
    res.status(500).json({ error: "Erro no assistente. Tente novamente." });
  }
};

// ──────────────────────────────────────────────────────────────────
// 5. GERAR DESCRIÇÃO DE PRODUTO
// ──────────────────────────────────────────────────────────────────
const generateProductDescription = async (req, res) => {
  try {
    const { name, category, price, emoji } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Nome do produto é obrigatório" });

    const prompt = `Crie uma descrição comercial atraente para este produto de pet shop:\nNome: ${name}\nCategoria: ${category || "pet shop"}\nPreço: ${price ? `R$ ${price}` : "a definir"}\nEmoji: ${emoji || "🐾"}\n\nEscreva 1-2 frases (máximo 120 caracteres). Destaque o benefício. Sem aspas nem markdown.\nResponda APENAS com o texto da descrição.`;

    const description = await callGemini(prompt, "", 150);
    res.json({ description: description.trim().slice(0, 150) });
  } catch (err) {
    console.error("generateProductDescription error:", err);
    res.status(500).json({ error: "Erro ao gerar descrição." });
  }
};

module.exports = {
  customerChat,
  getRecommendations,
  storeAssistant,
  adminAssistant,
  generateProductDescription,
};