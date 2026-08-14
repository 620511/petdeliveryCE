// backend/create-admin.js
require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("./src/config/database");

async function main() {
  const name = "Administrador";
  const email = "georgesilvanilva@gmail.com";

  // Defina ADMIN_PASSWORD nas variáveis de ambiente.
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error("ADMIN_PASSWORD não configurada.");
  }

  if (password.length < 6) {
    throw new Error("ADMIN_PASSWORD deve ter no mínimo 6 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });

  if (existing) {
    const user = await prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        role: "admin",
        isActive: true,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    console.log("Administrador atualizado:", user);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "admin",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  console.log("Administrador criado:", user);
}

main()
  .catch((error) => {
    console.error("Erro ao criar administrador:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });