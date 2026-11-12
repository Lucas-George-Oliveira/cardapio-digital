const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Limpando banco de dados...");
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.mesa.deleteMany(); // Nova linha: Limpa as mesas antigas

  console.log("Criando mesas...");
  await prisma.mesa.createMany({
    data: [
      { numero: 1, status: "LIVRE" },
      { numero: 2, status: "LIVRE" },
      { numero: 3, status: "LIVRE" },
    ],
  });

  console.log("Criando categorias e produtos...");
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

  console.log("✅ Mesas e Produtos inseridos com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
