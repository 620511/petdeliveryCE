// backend/seeds/rename-pet-subcategories.js
// Renomeia as subcategorias genéricas "Ração Adulto"/"Ração Filhote"/"Medicamento"
// para o padrão com o nome do animal (ex: "Gato Adulto", "Gato Filhote", "Medicamentos")
// Não duplica, não apaga produtos — só renomeia os registros existentes.
// Uso: node seeds/rename-pet-subcategories.js

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Categoria → { nome_atual: nome_novo }
const RENAME_MAP = {
  "Cachorro": {
    "Ração Adulto":  "Cachorro Adulto",
    "Ração Filhote": "Cachorro Filhote",
    "Medicamento":   "Medicamentos",
  },
  "Gato": {
    "Ração Adulto":  "Gato Adulto",
    "Ração Filhote": "Gato Filhote",
    "Medicamento":   "Medicamentos",
  },
  "Peixe": {
    "Ração Adulto":  "Peixe Adulto",
    "Ração Filhote": "Peixe Filhote",
    "Medicamento":   "Medicamentos",
  },
  "Aves": {
    "Ração Adulto":  "Aves Adulto",
    "Ração Filhote": "Aves Filhote",
    "Medicamento":   "Medicamentos",
  },
  "Pássaros": {
    "Ração Adulto":  "Pássaros Adulto",
    "Ração Filhote": "Pássaros Filhote",
    "Medicamento":   "Medicamentos",
  },
};

// Subcategoria "Ração" genérica (a antiga, antes de existirem Adulto/Filhote) — remove se estiver vazia
const REMOVE_IF_EMPTY = ["Ração"];

async function main() {
  console.log("🔤 Renomeando subcategorias de Pet...\n");

  for (const [categoryName, renames] of Object.entries(RENAME_MAP)) {
    const category = await prisma.category.findFirst({
      where: { name: categoryName },
      include: { subcategories: true },
    });

    if (!category) {
      console.log(`⚠️  Categoria "${categoryName}" não encontrada — pulando`);
      continue;
    }

    console.log(`📁 ${categoryName}`);

    for (const [oldName, newName] of Object.entries(renames)) {
      const sub = category.subcategories.find((s) => s.name === oldName);
      if (!sub) {
        console.log(`   ⚠️  Subcategoria "${oldName}" não encontrada — pulando`);
        continue;
      }

      // Já existe uma subcategoria com o nome novo? (evita duplicar)
      const alreadyExists = category.subcategories.find((s) => s.name === newName);
      if (alreadyExists) {
        console.log(`   ⚠️  "${newName}" já existe — pulando renomeio de "${oldName}"`);
        continue;
      }

      await prisma.subcategory.update({
        where: { id: sub.id },
        data: { name: newName },
      });
      console.log(`   ✅ "${oldName}" → "${newName}"`);
    }

    // Remove a subcategoria genérica "Ração" se não tiver nenhum produto vinculado
    for (const genericName of REMOVE_IF_EMPTY) {
      const generic = category.subcategories.find((s) => s.name === genericName);
      if (!generic) continue;

      const productCount = await prisma.product.count({ where: { subcategoryId: generic.id } });
      if (productCount === 0) {
        await prisma.subcategory.delete({ where: { id: generic.id } });
        console.log(`   🗑️  "${genericName}" removida (estava vazia)`);
      } else {
        console.log(`   ⚠️  "${genericName}" tem ${productCount} produto(s) — mantida sem alteração`);
      }
    }

    console.log("");
  }

  // Mostra o resultado final
  const all = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { subcategories: { orderBy: { sortOrder: "asc" } } },
  });

  console.log("📋 Estrutura final:");
  for (const c of all) {
    console.log(`  ${c.emoji ?? "  "} ${c.name}`);
    for (const s of c.subcategories) {
      console.log(`      • ${s.name}`);
    }
  }

  console.log("\n🎉 Pronto!");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
