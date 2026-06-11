// backend/seeds/seed.js
// FIX: reescrito com Prisma — elimina SQL injection via template literal
// Uso: node seeds/seed.js

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...\n");

  // ── Limpar na ordem correta (respeita FKs) ─────────────────────
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.store.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  console.log("🧹 Banco limpo");

  // ── Usuários ───────────────────────────────────────────────────
  const [admin, lojista1, lojista2, cliente1, cliente2] = await Promise.all([
    prisma.user.create({ data: {
      name: "Admin Sistema",       email: "admin@petdelivery.com",
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "admin", phone: "(11) 99999-0000",
    }}),
    prisma.user.create({ data: {
      name: "Pet Shop Central",    email: "loja@petdelivery.com",
      passwordHash: await bcrypt.hash("loja123", 10),
      role: "store_owner", phone: "(11) 98888-0001",
    }}),
    prisma.user.create({ data: {
      name: "Pet Mania",           email: "mania@petdelivery.com",
      passwordHash: await bcrypt.hash("loja123", 10),
      role: "store_owner", phone: "(11) 98888-0002",
    }}),
    prisma.user.create({ data: {
      name: "João Silva",          email: "joao@email.com",
      passwordHash: await bcrypt.hash("cliente123", 10),
      role: "customer", phone: "(11) 97777-0001",
    }}),
    prisma.user.create({ data: {
      name: "Maria Santos",        email: "maria@email.com",
      passwordHash: await bcrypt.hash("cliente123", 10),
      role: "customer", phone: "(11) 97777-0002",
    }}),
  ]);
  console.log("✅ Usuários criados");

  // ── Categorias + Subcategorias ─────────────────────────────────
  const subcatNames = ["Ração", "Acessórios", "Brinquedos", "Petiscos", "Remédio"];

  const catData = [
    { name: "Cachorros", emoji: "🐕", sortOrder: 1 },
    { name: "Gatos",     emoji: "🐈", sortOrder: 2 },
    { name: "Pássaros",  emoji: "🐦", sortOrder: 3 },
    { name: "Peixes",    emoji: "🐟", sortOrder: 4 },
    { name: "Aves",      emoji: "🦜", sortOrder: 5 },
  ];

  const categories = [];
  for (const [i, c] of catData.entries()) {
    const cat = await prisma.category.create({
      data: {
        name: c.name, emoji: c.emoji, sortOrder: c.sortOrder,
        subcategories: {
          create: subcatNames.map((name, j) => ({ name, sortOrder: j })),
        },
      },
      include: { subcategories: true },
    });
    categories.push(cat);
  }
  console.log("✅ Categorias e subcategorias criadas");

  const dogCat  = categories[0];
  const catCat  = categories[1];
  const subOf   = (cat) => Object.fromEntries(cat.subcategories.map((s) => [s.name, s.id]));
  const dogSubs = subOf(dogCat);
  const catSubs = subOf(catCat);

  // ── Lojas ──────────────────────────────────────────────────────
  const [store1, store2] = await Promise.all([
    prisma.store.create({ data: {
      ownerId: lojista1.id, name: "Pet Shop Central",
      description: "Sua loja pet favorita com os melhores produtos",
      address: "Rua das Flores, 123 - Centro",
      phone: "(11) 3333-0001",
      isActive: true, isOpen: true,
      deliveryFee: 8.90, deliveryTimeMin: 30, deliveryTimeMax: 50,
    }}),
    prisma.store.create({ data: {
      ownerId: lojista2.id, name: "Pet Mania",
      description: "Variedade e qualidade para todos os pets",
      address: "Av. Principal, 456 - Jardins",
      phone: "(11) 3333-0002",
      isActive: true, isOpen: true,
      deliveryFee: 6.90, deliveryTimeMin: 25, deliveryTimeMax: 45,
    }}),
  ]);
  console.log("✅ Lojas criadas");

  // ── Produtos ───────────────────────────────────────────────────
  const products = [
    // Cachorros – Ração
    { storeId: store1.id, categoryId: dogCat.id, subcategoryId: dogSubs["Ração"],
      name: "Ração Premium Adulto", description: "15kg • Frango e Arroz",
      price: 79.90, stock: 50, emoji: "🥩", badge: "Mais Vendido",
      rating: 4.8, reviewCount: 234 },
    { storeId: store1.id, categoryId: dogCat.id, subcategoryId: dogSubs["Ração"],
      name: "Ração Filhote",        description: "10kg • Leite e Cereais",
      price: 65.90, stock: 35, emoji: "🍚", badge: null,
      rating: 4.5, reviewCount: 98 },
    { storeId: store1.id, categoryId: dogCat.id, subcategoryId: dogSubs["Ração"],
      name: "Ração Grain Free",     description: "12kg • Sem Glúten",
      price: 124.90, stock: 20, emoji: "🌿", badge: "Premium",
      rating: 4.9, reviewCount: 67 },
    // Cachorros – Brinquedos
    { storeId: store1.id, categoryId: dogCat.id, subcategoryId: dogSubs["Brinquedos"],
      name: "Osso de Nylon",        description: "Sabor bacon",
      price: 29.90, stock: 80, emoji: "🦴", badge: "Mais Vendido",
      rating: 4.6, reviewCount: 312 },
    { storeId: store1.id, categoryId: dogCat.id, subcategoryId: dogSubs["Brinquedos"],
      name: "Kong Recheável",       description: "Inteligência canina",
      price: 49.90, stock: 40, emoji: "🧩", badge: null,
      rating: 4.7, reviewCount: 145 },
    // Cachorros – Petiscos
    { storeId: store2.id, categoryId: dogCat.id, subcategoryId: dogSubs["Petiscos"],
      name: "Petisco Natural",      description: "Frango desidratado",
      price: 15.90, stock: 120, emoji: "🍖", badge: "Natural",
      rating: 4.8, reviewCount: 289 },
    { storeId: store2.id, categoryId: dogCat.id, subcategoryId: dogSubs["Petiscos"],
      name: "Biscoito Premium",     description: "Cereais integrais",
      price: 12.90, stock: 90, emoji: "🍪", badge: null,
      rating: 4.3, reviewCount: 76 },
    // Gatos – Ração
    { storeId: store1.id, categoryId: catCat.id, subcategoryId: catSubs["Ração"],
      name: "Ração Gato Indoor",    description: "10kg • Frango",
      price: 68.90, stock: 45, emoji: "🐱", badge: "Mais Vendido",
      rating: 4.7, reviewCount: 201 },
    { storeId: store2.id, categoryId: catCat.id, subcategoryId: catSubs["Ração"],
      name: "Wet Food Atum",        description: "85g • Sachê",
      price: 8.90, stock: 200, emoji: "🐟", badge: null,
      rating: 4.5, reviewCount: 432 },
    // Gatos – Petiscos
    { storeId: store2.id, categoryId: catCat.id, subcategoryId: catSubs["Petiscos"],
      name: "Dreamies Frango",      description: "40g • Original",
      price: 10.90, stock: 150, emoji: "⭐", badge: "Favorito",
      rating: 4.9, reviewCount: 567 },
      // Pássaros – Ração
{ storeId: store1.id, categoryId: categories[2].id, subcategoryId: subOf(categories[2])["Ração"],
  name: "Mistura Canário", description: "1kg • Sementes", price: 18.90, stock: 50, emoji: "🌻", badge: null, rating: 4.5, reviewCount: 45 },
{ storeId: store1.id, categoryId: categories[2].id, subcategoryId: subOf(categories[2])["Ração"],
  name: "Ração Calopsita", description: "1kg • Premium", price: 22.90, stock: 40, emoji: "⭐", badge: "Mais Vendido", rating: 4.8, reviewCount: 89 },

// Peixes – Ração  
{ storeId: store2.id, categoryId: categories[3].id, subcategoryId: subOf(categories[3])["Ração"],
  name: "Ração Tropical", description: "50g • Floco", price: 22.90, stock: 100, emoji: "🐠", badge: "Mais Vendido", rating: 4.7, reviewCount: 123 },
{ storeId: store2.id, categoryId: categories[3].id, subcategoryId: subOf(categories[3])["Ração"],
  name: "Ração Betta", description: "20g • Grânulo", price: 15.90, stock: 80, emoji: "🐡", badge: null, rating: 4.5, reviewCount: 67 },

// Aves – Ração
{ storeId: store1.id, categoryId: categories[4].id, subcategoryId: subOf(categories[4])["Ração"],
  name: "Mistura Pomba", description: "2kg • Grão misto", price: 24.90, stock: 60, emoji: "🕊️", badge: null, rating: 4.4, reviewCount: 34 },
{ storeId: store2.id, categoryId: categories[4].id, subcategoryId: subOf(categories[4])["Ração"],
  name: "Ração Galinha", description: "5kg • Postura", price: 35.90, stock: 45, emoji: "🐓", badge: null, rating: 4.6, reviewCount: 56 },
  ];

  const createdProducts = [];
  for (const p of products) {
    const prod = await prisma.product.create({ data: p });
    createdProducts.push(prod);
  }
  console.log("✅ Produtos criados");

  // ── Endereços ──────────────────────────────────────────────────
  const [addr1] = await Promise.all([
    prisma.address.create({ data: {
      userId: cliente1.id, label: "Casa",
      street: "Rua das Flores", number: "123",
      neighborhood: "Centro", city: "São Paulo",
      state: "SP", zipCode: "01001-000", isDefault: true,
    }}),
    prisma.address.create({ data: {
      userId: cliente2.id, label: "Casa",
      street: "Av. Paulista", number: "456",
      neighborhood: "Bela Vista", city: "São Paulo",
      state: "SP", zipCode: "01310-100", isDefault: true,
    }}),
  ]);
  console.log("✅ Endereços criados");

  // ── Pedido de exemplo ──────────────────────────────────────────
  const [p1, p2] = createdProducts;
  const subtotal = p1.price + p2.price;

  const order = await prisma.order.create({
    data: {
      customerId:      cliente1.id,
      storeId:         store1.id,
      addressId:       addr1.id,
      deliveryAddress: "Rua das Flores, 123 - Centro, São Paulo/SP",
      status:          "delivered",
      paymentMethod:   "pix",
      subtotal,
      deliveryFee:     0,
      total:           subtotal,
      estimatedDeliveryAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      deliveredAt:         new Date(Date.now() - 2 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: p1.id, productName: p1.name, productEmoji: p1.emoji, productPrice: p1.price, quantity: 1, total: p1.price },
          { productId: p2.id, productName: p2.name, productEmoji: p2.emoji, productPrice: p2.price, quantity: 1, total: p2.price },
        ],
      },
    },
  });

  await prisma.review.create({
    data: {
      orderId: order.id, customerId: cliente1.id, storeId: store1.id,
      rating: 5, comment: "Entrega rápida e produtos de ótima qualidade!",
    },
  });

  // Atualiza rating da loja manualmente (o trigger do Prisma não existe, fazemos aqui)
  await prisma.store.update({
    where: { id: store1.id },
    data: { rating: 5.0, reviewCount: 1 },
  });

  console.log("✅ Pedido e review de exemplo criados");

  console.log("\n🎉 Seed concluído!\n");
  console.log("Credenciais:");
  console.log("  Admin:   admin@petdelivery.com / admin123");
  console.log("  Lojista: loja@petdelivery.com  / loja123");
  console.log("  Cliente: joao@email.com         / cliente123");
}

main()
  .catch((e) => { console.error("❌ Erro no seed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
