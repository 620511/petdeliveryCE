require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("./src/config/database");

async function main() {
  const name = "Administrador";
  const email = "georgesilvanilva@gmail.com";
  const password = "25120109Gn$";

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "admin",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log("Administrador atualizado:", user);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

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