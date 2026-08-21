// backend/seeds/add-pet-categories.js
// Adiciona categorias de Pet (Cachorro, Gato, Peixe, Aves, Pássaros) sem apagar dados existentes
// Uso: node seeds/add-pet-categories.js

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Mesmas 3 subcategorias em todas as categorias de pet
const PET_SUBCATEGORIES = ["Ração", "Higiene", "Acessórios"];

const newCategories = [
  {
    name: "Cachorro",
    emoji: "🐶",
    sortOrder: 1,
    subcategories: PET_SUBCATEGORIES,
  },
  {
    name: "Gato",
    emoji: "🐱",
    sortOrder: 2,
    subcategories: PET_SUBCATEGORIES,
  },
  {
    name: "Peixe",
    emoji: "🐠",
    sortOrder: 3,
    subcategories: PET_SUBCATEGORIES,
  },
  {
    name: "Aves",
    emoji: "🦜",
    sortOrder: 4,
    subcategories: PET_SUBCATEGORIES,
  },
  {
    name: "Pássaros",
    emoji: "🐦",
    sortOrder: 5,
    subcategories: PET_SUBCATEGORIES,
  },
];

async function main() {
  console.log("🐾 Adicionando categorias de Pet...\n");

  for (const catData of newCategories) {
    // Verifica se já existe
    const existing = await prisma.category.findFirst({
      where: { name: catData.name },
    });

    if (existing) {
      console.log(`⚠️  Categoria "${catData.name}" já existe — pulando`);
      continue;
    }

    // Cria categoria + subcategorias
    const created = await prisma.category.create({
      data: {
        name: catData.name,
        emoji: catData.emoji,
        sortOrder: catData.sortOrder,
        isActive: true,
        subcategories: {
          create: catData.subcategories.map((name, i) => ({
            name,
            sortOrder: i,
          })),
        },
      },
      include: { subcategories: true },
    });

    console.log(
      `✅ "${created.emoji} ${created.name}" criada com ${created.subcategories.length} subcategorias`
    );
  }

  // Lista todas as categorias ativas ao final
  const all = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { subcategories: true, products: true } } },
  });

  console.log("\n📋 Categorias ativas no banco:");
  for (const c of all) {
    console.log(
      `  ${c.emoji ?? "  "} ${c.name.padEnd(25)} | ${c._count.subcategories} subcats | ${c._count.products} produtos`
    );
  }

  console.log("\n🎉 Pronto! Nenhum dado existente foi alterado.");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
