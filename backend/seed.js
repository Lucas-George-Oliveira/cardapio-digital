const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Limpando banco de dados...");
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.categoria.deleteMany();

  console.log("Criando categorias e produtos...");

  // Cria a categoria Lanches e já vincula os produtos nela
  await prisma.categoria.create({
    data: {
      nome: "Lanches",
      produtos: {
        create: [
          { nome: "X-Burger", preco: 15.0, disponivel: true },
          { nome: "X-Bacon", preco: 22.5, disponivel: true },
        ],
      },
    },
  });

  // Cria a categoria Bebidas com seus produtos
  await prisma.categoria.create({
    data: {
      nome: "Bebidas",
      produtos: {
        create: [
          { nome: "Coca-Cola Lata", preco: 6.0, disponivel: true },
          { nome: "Suco de Laranja", preco: 9.0, disponivel: true },
        ],
      },
    },
  });

  console.log("✅ Dados de teste inseridos com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
