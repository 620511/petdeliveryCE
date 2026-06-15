require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Limpando banco...");
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
  
  console.log("✅ Banco limpo!");
  
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@petdelivery.com",
      passwordHash: hash,
      role: "ADMIN",
      phone: "(85) 99999-0000",
    }
  });
  
  console.log("✅ Admin criado!");
  console.log("📧 admin@petdelivery.com / admin123");
}

main().catch(console.error).finally(() => prisma.$disconnect());