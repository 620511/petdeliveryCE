// backend/seeds/add-pet-categories.js
// Adiciona categorias de Pet (Cachorro, Gato, Peixe, Aves, Pássaros) sem apagar dados existentes
// Cada categoria recebe as subcategorias: Ração Adulto, Ração Filhote, Acessórios, Medicamento, Higiene
// Uso: node seeds/add-pet-categories.js

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Mesmas 5 subcategorias em todas as categorias de pet
const PET_SUBCATEGORIES = ["Ração Adulto", "Ração Filhote", "Acessórios", "Medicamento", "Higiene"];

const newCategories = [
  { name: "Cachorro",  emoji: "🐶", sortOrder: 1, subcategories: PET_SUBCATEGORIES },
  { name: "Gato",      emoji: "🐱", sortOrder: 2, subcategories: PET_SUBCATEGORIES },
  { name: "Peixe",     emoji: "🐠", sortOrder: 3, subcategories: PET_SUBCATEGORIES },
  { name: "Aves",      emoji: "🦜", sortOrder: 4, subcategories: PET_SUBCATEGORIES },
  { name: "Pássaros",  emoji: "🐦", sortOrder: 5, subcategories: PET_SUBCATEGORIES },
];

async function main() {
  console.log("🐾 Adicionando categorias de Pet...\n");

  for (const catData of newCategories) {
    // Verifica se já existe
    const existing = await prisma.category.findFirst({
      where: { name: catData.name },
      include: { subcategories: true },
    });

    if (existing) {
      console.log(`⚠️  Categoria "${catData.name}" já existe (${existing.subcategories.length} subcats) — verificando subcategorias faltando...`);

      const existingNames = existing.subcategories.map((s) => s.name);
      const missing = catData.subcategories.filter((name) => !existingNames.includes(name));

      if (missing.length === 0) {
        console.log(`   ✅ Nenhuma subcategoria faltando`);
        continue;
      }

      for (const [i, name] of missing.entries()) {
        await prisma.subcategory.create({
          data: { categoryId: existing.id, name, sortOrder: existingNames.length + i },
        });
      }
      console.log(`   ✅ Adicionadas: ${missing.join(", ")}`);
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

  // Lista todas as categorias ativas ao final, com subcategorias
  const all = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { subcategories: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } },
  });

  console.log("\n📋 Categorias ativas no banco:");
  for (const c of all) {
    console.log(`  ${c.emoji ?? "  "} ${c.name} (${c._count.products} produtos)`);
    for (const s of c.subcategories) {
      console.log(`      • ${s.name}`);
    }
  }

  console.log("\n🎉 Pronto! Nenhum dado existente foi alterado.");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
