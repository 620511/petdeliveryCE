// backend/seeds/add-agro-categories.js
// Adiciona categorias Agro, Jardim e Pecuária sem apagar dados existentes
// Uso: node seeds/add-agro-categories.js

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Novas categorias a adicionar
const newCategories = [
  {
    name: "Agro",
    emoji: "🐄",
    sortOrder: 10,
    subcategories: [
      "Ração Bovinos",
      "Ração Equinos",
      "Ração Suínos",
      "Medicamentos Vet.",
      "Ferramentas Rurais",
      "Sementes e Adubos",
    ],
  },
  {
    name: "Jardim",
    emoji: "🌱",
    sortOrder: 11,
    subcategories: [
      "Sementes",
      "Adubos e Fertilizantes",
      "Vasos e Suportes",
      "Ferramentas de Jardim",
      "Defensivos",
      "Irrigação",
    ],
  },
  {
    name: "Pecuária e Avicultura",
    emoji: "🐔",
    sortOrder: 12,
    subcategories: [
      "Ração Aves",
      "Ração Suínos",
      "Ração Bovinos",
      "Medicamentos",
      "Equipamentos",
      "Acessórios",
    ],
  },
];

async function main() {
  console.log("🌱 Adicionando categorias Agro...\n");

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