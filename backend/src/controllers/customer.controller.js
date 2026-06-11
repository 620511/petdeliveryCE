// backend/src/controllers/customer.controller.js
// FASE 1: taxa de 5% (platform_fee) calculada e salva em cada pedido
const prisma  = require("../config/database");
const { getIO } = require("../config/socket");
const { sendOrderConfirmation } = require("../services/email.service");

// Constante da taxa da plataforma — mudar aqui reflete em todo o sistema
const PLATFORM_FEE_RATE = 0.05; // 5%

// FRETE DINÂMICO: fórmula Haversine (distância em km entre dois pontos GPS)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/customer/stores
const listStores = async (req, res) => {
  const { search } = req.query;
  const stores = await prisma.store.findMany({
    where: {
      isActive: true,
      ...(search && { name: { contains: search, mode: "insensitive" } }),
    },
    orderBy: [{ isOpen: "desc" }, { rating: "desc" }],
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });

  res.json(stores.map((s) => ({
    id: s.id, name: s.name, description: s.description, logoUrl: s.logoUrl,
    address: s.address, is_open: s.isOpen, rating: s.rating,
    review_count: s.reviewCount, delivery_time_min: s.deliveryTimeMin,
    delivery_time_max: s.deliveryTimeMax, delivery_fee: s.deliveryFee,
    min_order_value: s.minOrderValue, product_count: s._count.products,
  })));
};

// GET /api/customer/stores/:id/products
const getStoreProducts = async (req, res) => {
  const { id } = req.params;
  const { category_id, subcategory_id, search } = req.query;

  const store = await prisma.store.findUnique({ where: { id, isActive: true } });
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        storeId: id, isActive: true, stock: { gt: 0 },
        ...(category_id    && { categoryId: category_id }),
        ...(subcategory_id && { subcategoryId: subcategory_id }),
        ...(search         && { name: { contains: search, mode: "insensitive" } }),
      },
      orderBy: { rating: "desc" },
      include: { category: { select: { name: true } }, subcategory: { select: { name: true } } },
    }),
    prisma.category.findMany({
      where: { isActive: true, products: { some: { storeId: id, isActive: true } } },
      orderBy: { sortOrder: "asc" },
      include: { subcategories: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } } },
    }),
  ]);

  res.json({
    store,
    products: products.map((p) => ({
      id: p.id, name: p.name, description: p.description, price: p.price,
      stock: p.stock, emoji: p.emoji, image_url: p.imageUrl, badge: p.badge,
      rating: p.rating, review_count: p.reviewCount,
      category_name: p.category?.name || null,
      subcategory_name: p.subcategory?.name || null,
      category_id: p.categoryId, subcategory_id: p.subcategoryId,
    })),
    categories,
  });
};

// GET /api/customer/categories
const getCategories = async (req, res) => {
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { subcategories: { orderBy: { sortOrder: "asc" } } },
  });
  res.json(cats);
};

// POST /api/customer/orders
const createOrder = async (req, res) => {
  const { store_id, items, payment_method, address_id, delivery_address, notes } = req.body;

  if (!store_id)       return res.status(400).json({ error: "store_id obrigatório" });
  if (!items?.length)  return res.status(400).json({ error: "Carrinho vazio" });
  if (!payment_method) return res.status(400).json({ error: "payment_method obrigatório" });

  const validPayments = ["pix", "credit_card", "debit_card", "cash", "mercadopago"];
  if (!validPayments.includes(payment_method))
    return res.status(400).json({ error: "Método de pagamento inválido" });

  const order = await prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: store_id } });
    if (!store?.isActive || !store?.isOpen)
      throw Object.assign(new Error("Loja fechada ou inativa"), { statusCode: 400 });

    let subtotal = 0;
    const enriched = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1)
        throw Object.assign(new Error("Item inválido no carrinho"), { statusCode: 400 });

      const product = await tx.product.findFirst({
        where: { id: item.product_id, storeId: store_id, isActive: true, stock: { gte: item.quantity } },
      });

      if (!product)
        throw Object.assign(new Error(`Produto ${item.product_id} indisponível`), { statusCode: 400 });

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      enriched.push({ product, quantity: item.quantity, itemTotal });
    }

    if (subtotal < store.minOrderValue)
      throw Object.assign(new Error(`Pedido mínimo: R$ ${store.minOrderValue.toFixed(2)}`), { statusCode: 400 });

    // FRETE DINÂMICO: buscar faixas de entrega da loja
    const deliveryZones = await tx.deliveryZone.findMany({
      where:   { storeId: store_id, isActive: true },
      orderBy: { maxKm: "asc" },
    });

    let deliveryFee = store.deliveryFee; // fallback: frete fixo cadastrado

    if (deliveryZones.length > 0 && store.lat && store.lng) {
      // Tenta geocodificar o endereço do cliente se não vieram coordenadas
      const clientLat = req.body.customer_lat;
      const clientLng = req.body.customer_lng;

      if (clientLat && clientLng) {
        const distKm = haversine(store.lat, store.lng, clientLat, clientLng);
        const zone   = deliveryZones.find(z => distKm <= z.maxKm);

        if (!zone) {
          throw Object.assign(
            new Error(`Endereço fora da área de entrega (máx. ${deliveryZones[deliveryZones.length - 1].maxKm} km)`),
            { statusCode: 400 }
          );
        }

        // Frete grátis se subtotal >= freeAbove da faixa
        deliveryFee = (zone.freeAbove && subtotal >= zone.freeAbove) ? 0 : zone.fee;
      }
      // Se não vieram coordenadas do cliente, usa frete fixo como fallback
    } else if (subtotal >= 99) {
      deliveryFee = 0; // regra antiga de frete grátis acima de R$99
    }
    const total       = subtotal + deliveryFee;

    // ── FASE 1: calcular taxa da plataforma ────────────────────────
    // Taxa incide sobre o subtotal dos produtos (sem o frete)
    const platformFee = parseFloat((subtotal * PLATFORM_FEE_RATE).toFixed(2));
    const storeNet    = parseFloat((total - platformFee).toFixed(2));
    // ──────────────────────────────────────────────────────────────

    let deliveryAddr = delivery_address || null;
    if (address_id && !deliveryAddr) {
      const addr = await tx.address.findFirst({ where: { id: address_id, userId: req.user.id } });
      if (addr) {
        deliveryAddr = [addr.street, addr.number, addr.neighborhood, `${addr.city}/${addr.state}`]
          .filter(Boolean).join(", ");
      }
    }

    const avgMin     = (store.deliveryTimeMin + store.deliveryTimeMax) / 2;
    const estimatedAt = new Date(Date.now() + avgMin * 60_000);

    const created = await tx.order.create({
      data: {
        customerId: req.user.id, storeId: store_id,
        addressId: address_id || null, deliveryAddress: deliveryAddr,
        paymentMethod: payment_method, subtotal, deliveryFee, total,
        // ── FASE 1: gravar taxa ───────────────────────────────────
        platformFee,
        storeNet,
        // ─────────────────────────────────────────────────────────
        notes: notes || null, estimatedDeliveryAt: estimatedAt,
        items: {
          create: enriched.map(({ product, quantity, itemTotal }) => ({
            productId: product.id, productName: product.name,
            productEmoji: product.emoji, productPrice: product.price,
            quantity, total: itemTotal,
          })),
        },
      },
      include: { items: true, store: { select: { name: true, owner: { select: { email: true } } } } },
    });

    for (const { product, quantity } of enriched) {
      await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: quantity } } });
    }

    return { created, store, deliveryFee, platformFee, storeNet };
  });

  const { created, store, deliveryFee, platformFee, storeNet } = order;

  // ── Socket: notifica lojista em tempo real ─────────────────────
  getIO().to(`store:${store_id}`).emit("order:new", {
    orderId:      created.id,
    total:        created.total,
    customerName: req.user.name,
    itemCount:    created.items.length,
    createdAt:    created.createdAt,
  });

  // ── E-mail: confirmação para o cliente ─────────────────────────
  sendOrderConfirmation({
    to:                  req.user.email,
    customerName:        req.user.name,
    orderId:             created.id,
    total:               created.total,
    deliveryFee,
    items:               created.items,
    estimatedDeliveryAt: created.estimatedDeliveryAt,
    storeName:           created.store.name,
  });

  res.status(201).json({
    id:                    created.id,
    status:                created.status,
    total:                 created.total,
    subtotal:              created.subtotal,
    delivery_fee:          created.deliveryFee,
    // FASE 1: exposto na resposta (útil para debug / futuro recibo)
    platform_fee:          platformFee,
    store_net:             storeNet,
    estimated_delivery_at: created.estimatedDeliveryAt,
  });
};

// GET /api/customer/orders
const listOrders = async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { customerId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: { store: { select: { name: true, logoUrl: true } }, items: true },
  });

  res.json(orders.map((o) => ({
    id: o.id, status: o.status, total: o.total, subtotal: o.subtotal,
    delivery_fee: o.deliveryFee, payment_method: o.paymentMethod,
    delivery_address: o.deliveryAddress, created_at: o.createdAt,
    estimated_delivery_at: o.estimatedDeliveryAt,
    store_name: o.store.name, store_logo: o.store.logoUrl,
    items: o.items.map((i) => ({ name: i.productName, emoji: i.productEmoji, qty: i.quantity, price: i.productPrice })),
  })));
};

// GET /api/customer/orders/:id
const getOrder = async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, customerId: req.user.id },
    include: { store: { select: { name: true, phone: true } }, items: true },
  });
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

  res.json({
    ...order,
    store_name:  order.store.name,
    store_phone: order.store.phone,
    items: order.items.map((i) => ({ name: i.productName, emoji: i.productEmoji, qty: i.quantity, price: i.productPrice, total: i.total })),
  });
};

// GET /api/customer/addresses
const listAddresses = async (req, res) => {
  const list = await prisma.address.findMany({
    where: { userId: req.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  res.json(list);
};

// POST /api/customer/addresses
const createAddress = async (req, res) => {
  const { label, street, number, complement, neighborhood, city, state, zip_code, is_default } = req.body;
  if (!street?.trim() || !city?.trim() || !state?.trim())
    return res.status(400).json({ error: "Rua, cidade e estado são obrigatórios" });

  if (is_default) await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });

  const addr = await prisma.address.create({
    data: {
      userId: req.user.id, label: label || "Casa",
      street: street.trim(), number: number || null,
      complement: complement || null, neighborhood: neighborhood || null,
      city: city.trim(), state: state.trim().toUpperCase(),
      zipCode: zip_code || "", isDefault: is_default || false,
    },
  });
  res.status(201).json(addr);
};

// GET /api/customer/profile
const getProfile = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, phone: true, avatarUrl: true, createdAt: true },
  });
  res.json(user);
};

// PUT /api/customer/profile
const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nome é obrigatório" });
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name: name.trim(), phone: phone || null },
    select: { id: true, name: true, email: true, phone: true },
  });
  res.json(user);
};

module.exports = {
  listStores, getStoreProducts, getCategories,
  createOrder, listOrders, getOrder,
  listAddresses, createAddress,
  getProfile, updateProfile,
};
