// backend/src/controllers/admin.controller.js
// FIX: migrado de pg raw para Prisma

const { Prisma } = require("@prisma/client");
const prisma = require("../config/database");

// GET /api/admin/dashboard
const dashboard = async (req, res) => {
  // FASE 1: inclui aggregate de platform_fee e store_net nos pedidos entregues
  const [usersCount, storesCount, ordersCount, revenueAgg, feesAgg, recentOrders] = await Promise.all([
    prisma.user.count({ where: { role: { in: ["customer", "store_owner"] }, isActive: true } }),
    prisma.store.count(),
    prisma.order.count(),
    prisma.order.aggregate({ where: { status: "delivered" }, _sum: { total: true } }),
    // FASE 1: soma das taxas e dos valores líquidos (campos nullable — pedidos antigos retornam null na soma)
    prisma.order.aggregate({
      where: { status: "delivered" },
      _sum: { platformFee: true, storeNet: true },
    }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, status: true, total: true, createdAt: true,
        platformFee: true, storeNet: true,
        customer: { select: { name: true } },
        store:    { select: { name: true } },
      },
    }),
  ]);

  const revenueChart = await prisma.$queryRaw`
    SELECT DATE(created_at)::text AS date,
           SUM(total)::float      AS revenue,
           COUNT(*)::int          AS count
    FROM orders
    WHERE status = 'delivered'
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  res.json({
    stats: {
      users:   usersCount,
      stores:  storesCount,
      orders:  ordersCount,
      revenue: revenueAgg._sum.total || 0,
      // FASE 1: se null (pedidos antigos sem o campo), estima com base na receita total
      platform_fees: feesAgg._sum.platformFee ?? null,
      store_nets:    feesAgg._sum.storeNet    ?? null,
    },
    recentOrders: recentOrders.map((o) => ({
      id:            o.id,
      status:        o.status,
      total:         o.total,
      created_at:    o.createdAt,
      customer_name: o.customer.name,
      store_name:    o.store.name,
    })),
    revenueChart,
  });
};

// GET /api/admin/users
const listUsers = async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    role: role ? role : { in: ["customer", "store_owner"] },
    ...(search && {
      OR: [
        { name:  { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, isActive: true, lastLogin: true, createdAt: true,
        store: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ users, total, page: Number(page), limit: Number(limit) });
};

// PUT /api/admin/users/:id
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, is_active, isActive, role } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name     && { name }),
      ...(email    && { email: email.toLowerCase() }),
      ...(role     && { role }),
      isActive: is_active ?? isActive,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  }).catch(() => null);

  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  res.json(user);
};

// DELETE /api/admin/users/:id  (soft delete)
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role === "admin") return res.status(404).json({ error: "Usuário não encontrado" });

  await prisma.user.update({ where: { id }, data: { isActive: false } });
  res.json({ message: "Usuário desativado" });
};

// GET /api/admin/stores
const listStores = async (req, res) => {
  const { is_active, search, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    ...(is_active !== undefined && { isActive: is_active === "true" }),
    ...(search && { name: { contains: search, mode: "insensitive" } }),
  };

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        owner:    { select: { name: true, email: true } },
        _count:   { select: { products: true, orders: true } },
      },
    }),
    prisma.store.count({ where }),
  ]);

  const result = stores.map((s) => ({
    ...s,
    owner_name:    s.owner.name,
    owner_email:   s.owner.email,
    product_count: s._count.products,
    order_count:   s._count.orders,
  }));

  res.json({ stores: result, total });
};

// PUT /api/admin/stores/:id
// PUT /api/admin/stores/:id
const updateStore = async (req, res) => {
  const { id } = req.params;
  const { is_active, isActive, name, delivery_fee, deliveryFee } = req.body;

  // FIX: resolve fee ANTES de usar em expressão
  const fee = delivery_fee ?? deliveryFee;

  const store = await prisma.store.update({
    where: { id },
    data: {
      isActive: is_active ?? isActive,
      ...(name && { name }),
      ...(fee != null && { deliveryFee: Number(fee) }),
    },
  }).catch(() => null);

  if (!store) return res.status(404).json({ error: "Loja não encontrada" });
  res.json(store);
};

// GET /api/admin/orders
const listOrders = async (req, res) => {
  const { status, store_id, storeId, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    ...(status              && { status }),
    ...((store_id || storeId) && { storeId: store_id || storeId }),
  };

  const orders = await prisma.order.findMany({
    where,
    skip,
    take: Number(limit),
    orderBy: { createdAt: "desc" },
    select: {
      id: true, status: true, total: true, paymentMethod: true, createdAt: true,
      customer: { select: { name: true } },
      store:    { select: { name: true } },
    },
  });

  res.json({
    orders: orders.map((o) => ({
      id:             o.id,
      status:         o.status,
      total:          o.total,
      payment_method: o.paymentMethod,
      created_at:     o.createdAt,
      customer_name:  o.customer.name,
      store_name:     o.store.name,
    })),
  });
};

// GET /api/admin/reports/revenue
const revenueReport = async (req, res) => {
  const { group_by = "day" } = req.query;

  const from = req.query.from
    ? new Date(req.query.from)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(req.query.to) : new Date();

  // FIX: prisma.$queryRaw com tagged template (seguro contra injection)
  let timeline;
  if (group_by === "month") {
    timeline = await prisma.$queryRaw`
      SELECT DATE_TRUNC('month', created_at)::text AS period,
             SUM(total)::float AS revenue, COUNT(*)::int AS orders,
             AVG(total)::float AS avg_ticket
      FROM orders
      WHERE status = 'delivered' AND created_at BETWEEN ${from} AND ${to}
      GROUP BY period ORDER BY period
    `;
  } else if (group_by === "week") {
    timeline = await prisma.$queryRaw`
      SELECT DATE_TRUNC('week', created_at)::text AS period,
             SUM(total)::float AS revenue, COUNT(*)::int AS orders,
             AVG(total)::float AS avg_ticket
      FROM orders
      WHERE status = 'delivered' AND created_at BETWEEN ${from} AND ${to}
      GROUP BY period ORDER BY period
    `;
  } else {
    timeline = await prisma.$queryRaw`
      SELECT DATE_TRUNC('day', created_at)::text AS period,
             SUM(total)::float AS revenue, COUNT(*)::int AS orders,
             AVG(total)::float AS avg_ticket
      FROM orders
      WHERE status = 'delivered' AND created_at BETWEEN ${from} AND ${to}
      GROUP BY period ORDER BY period
    `;
  }

  const byStore = await prisma.$queryRaw`
    SELECT s.name AS store,
           SUM(o.total)::float AS revenue,
           COUNT(o.id)::int    AS orders
    FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.status = 'delivered' AND o.created_at BETWEEN ${from} AND ${to}
    GROUP BY s.id, s.name
    ORDER BY revenue DESC
    LIMIT 10
  `;

  res.json({ timeline, byStore });
};

module.exports = { dashboard, listUsers, updateUser, deleteUser, listStores, updateStore, listOrders, revenueReport };
