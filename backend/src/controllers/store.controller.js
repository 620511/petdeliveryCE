// backend/src/controllers/store.controller.js
const prisma  = require("../config/database");
const { getIO } = require("../config/socket");
const { sendStatusUpdate } = require("../services/email.service");

const getMyStore = (ownerId) => prisma.store.findUnique({ where: { ownerId } });

// FRETE DINÂMICO: geocodifica endereço → lat/lng via Nominatim (OpenStreetMap, gratuito)
async function geocodeAddress(address) {
  try {
    const query = encodeURIComponent(`${address}, Brasil`);
    const res   = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { "User-Agent": "PetDelivery/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { return null; }
}

// GET /api/store/dashboard
const dashboard = async (req, res) => {
  const store = await getMyStore(req.user.id);
  if (!store) return res.status(404).json({ error: "Loja não encontrada. Configure seu perfil primeiro." });

  const [productsCount, ordersCount, revenueAgg, pendingCount, recentOrders, topProducts] = await Promise.all([
    prisma.product.count({ where: { storeId: store.id, isActive: true } }),
    prisma.order.count({ where: { storeId: store.id } }),
    prisma.order.aggregate({ where: { storeId: store.id, status: "delivered" }, _sum: { total: true } }),
    prisma.order.count({ where: { storeId: store.id, status: { in: ["pending","confirmed","preparing"] } } }),
    prisma.order.findMany({
      where: { storeId: store.id }, take: 10, orderBy: { createdAt: "desc" },
      select: { id: true, status: true, total: true, paymentMethod: true, createdAt: true,
        customer: { select: { name: true, phone: true } } },
    }),
    prisma.$queryRaw`
      SELECT p.name, p.emoji, p.price::float, SUM(oi.quantity)::int AS sold
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o   ON o.id = oi.order_id
      WHERE o.store_id = ${store.id} AND o.status = 'delivered'
      GROUP BY p.id, p.name, p.emoji, p.price
      ORDER BY sold DESC LIMIT 5
    `,
  ]);

  res.json({
    store,
    stats: {
      products: productsCount, orders: ordersCount,
      revenue: revenueAgg._sum.total || 0, pendingOrders: pendingCount,
    },
    recentOrders: recentOrders.map((o) => ({
      id: o.id, status: o.status, total: o.total,
      payment_method: o.paymentMethod, created_at: o.createdAt,
      customer_name: o.customer.name, customer_phone: o.customer.phone,
    })),
    topProducts,
  });
};

// GET /api/store/products
const listProducts = async (req, res) => {
  const store = await getMyStore(req.user.id);
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  const { category_id, search, is_active, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    storeId: store.id,
    ...(category_id && { categoryId: category_id }),
    ...(search      && { name: { contains: search, mode: "insensitive" } }),
    ...(is_active !== undefined && { isActive: is_active === "true" }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, skip, take: Number(limit), orderBy: { createdAt: "desc" },
      include: { category: { select: { name: true } }, subcategory: { select: { name: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    products: products.map((p) => ({
      ...p, category_name: p.category?.name || null, subcategory_name: p.subcategory?.name || null,
    })),
    total,
  });
};

// POST /api/store/products
const createProduct = async (req, res) => {
  const store = await getMyStore(req.user.id);
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  const { name, description, price, stock, emoji, image_url, badge, category_id, subcategory_id } = req.body;
  if (!name?.trim() || price === undefined) return res.status(400).json({ error: "Nome e preço são obrigatórios" });
  if (Number(price) < 0) return res.status(400).json({ error: "Preço não pode ser negativo" });

  const product = await prisma.product.create({
    data: {
      storeId: store.id, name: name.trim(), description: description || null,
      price: Number(price), stock: Number(stock) || 0,
      emoji: emoji || null, imageUrl: image_url || null, badge: badge || null,
      categoryId: category_id || null, subcategoryId: subcategory_id || null,
    },
  });
  res.status(201).json(product);
};

// PUT /api/store/products/:id
const updateProduct = async (req, res) => {
  const store = await getMyStore(req.user.id);
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  const { id } = req.params;
  const { name, description, price, stock, emoji, badge, is_active, isActive, category_id, subcategory_id, image_url } = req.body;

  const { count } = await prisma.product.updateMany({
    where: { id, storeId: store.id },
    data: {
      ...(name          !== undefined && { name }),
      ...(description   !== undefined && { description }),
      ...(price         !== undefined && { price: Number(price) }),
      ...(stock         !== undefined && { stock: Number(stock) }),
      ...(emoji         !== undefined && { emoji }),
      ...(image_url     !== undefined && { imageUrl: image_url }),
      ...(badge         !== undefined && { badge }),
      ...((is_active ?? isActive) !== undefined && { isActive: is_active ?? isActive }),
      ...(category_id    !== undefined && { categoryId: category_id }),
      ...(subcategory_id !== undefined && { subcategoryId: subcategory_id }),
    },
  });

  if (!count) return res.status(404).json({ error: "Produto não encontrado" });
  const updated = await prisma.product.findUnique({ where: { id } });
  res.json(updated);
};

// DELETE /api/store/products/:id
const deleteProduct = async (req, res) => {
  const store = await getMyStore(req.user.id);
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  const { count } = await prisma.product.updateMany({
    where: { id: req.params.id, storeId: store.id }, data: { isActive: false },
  });
  if (!count) return res.status(404).json({ error: "Produto não encontrado" });
  res.json({ message: "Produto desativado" });
};

// GET /api/store/orders
const listOrders = async (req, res) => {
  const store = await getMyStore(req.user.id);
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  const { status, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const orders = await prisma.order.findMany({
    where: { storeId: store.id, ...(status && { status }) },
    skip, take: Number(limit), orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true, phone: true } }, items: true },
  });

  res.json({
    orders: orders.map((o) => ({
      id: o.id, status: o.status, total: o.total, subtotal: o.subtotal,
      delivery_fee: o.deliveryFee, payment_method: o.paymentMethod,
      delivery_address: o.deliveryAddress, notes: o.notes, created_at: o.createdAt,
      customer_name: o.customer.name, customer_phone: o.customer.phone,
      items: o.items.map((i) => ({ name: i.productName, emoji: i.productEmoji, qty: i.quantity, price: i.productPrice })),
    })),
  });
};

// PUT /api/store/orders/:id/status
const updateOrderStatus = async (req, res) => {
  const store = await getMyStore(req.user.id);
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  const { id } = req.params;
  const { status } = req.body;
  const valid = ["confirmed","preparing","on_the_way","delivered","cancelled"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Status inválido" });

  const { count } = await prisma.order.updateMany({
    where: { id, storeId: store.id },
    data: { status, ...(status === "delivered" && { deliveredAt: new Date() }) },
  });
  if (!count) return res.status(404).json({ error: "Pedido não encontrado" });

  // Busca dados completos para notificações
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: { select: { name: true, email: true } } },
  });

  // ── Socket: notifica cliente em tempo real ─────────────────────
  getIO().to(`order:${id}`).emit("order:status", {
    orderId: id, status, updatedAt: new Date(),
  });

  // ── E-mail: avisa o cliente da mudança de status ───────────────
  sendStatusUpdate({
    to:           order.customer.email,
    customerName: order.customer.name,
    orderId:      id,
    status,
    storeName:    store.name,
  });

  res.json(order);
};

// GET /api/store/profile
const getProfile = async (req, res) => {
  const store = await getMyStore(req.user.id);
  if (!store) return res.status(404).json({ error: "Loja não encontrada. Crie sua loja primeiro." });
  res.json(store);
};

// PUT /api/store/profile
const updateProfile = async (req, res) => {
  const store = await getMyStore(req.user.id);
  const {
    name, description, address, phone,
    is_open, isOpen, delivery_fee, deliveryFee,
    delivery_time_min, deliveryTimeMin,
    delivery_time_max, deliveryTimeMax,
    min_order_value,  minOrderValue,
  } = req.body;

  const data = {};
  if (name          !== undefined) data.name            = name;
  if (description   !== undefined) data.description     = description;
  if (address       !== undefined) data.address         = address;
  if (phone         !== undefined) data.phone           = phone;
  if ((is_open ?? isOpen)             !== undefined) data.isOpen          = is_open ?? isOpen;
  if ((delivery_fee ?? deliveryFee)   !== undefined) data.deliveryFee     = Number(delivery_fee ?? deliveryFee);
  if ((delivery_time_min ?? deliveryTimeMin) !== undefined) data.deliveryTimeMin = Number(delivery_time_min ?? deliveryTimeMin);
  if ((delivery_time_max ?? deliveryTimeMax) !== undefined) data.deliveryTimeMax = Number(delivery_time_max ?? deliveryTimeMax);
  if ((min_order_value  ?? minOrderValue)    !== undefined) data.minOrderValue   = Number(min_order_value ?? minOrderValue);

  if (!store) {
    if (!name?.trim() || !address?.trim())
      return res.status(400).json({ error: "Nome e endereço são obrigatórios" });
    const newStore = await prisma.store.create({ data: { ownerId: req.user.id, ...data } });
    return res.status(201).json(newStore);
  }

  // FRETE DINÂMICO: se o endereço mudou, atualiza lat/lng automaticamente
  if (data.address) {
    const coords = await geocodeAddress(data.address);
    if (coords) { data.lat = coords.lat; data.lng = coords.lng; }
  }

  const updated = await prisma.store.update({ where: { id: store.id }, data });
  res.json(updated);
};

module.exports = {
  dashboard, listProducts, createProduct, updateProduct, deleteProduct,
  listOrders, updateOrderStatus, getProfile, updateProfile,
};
