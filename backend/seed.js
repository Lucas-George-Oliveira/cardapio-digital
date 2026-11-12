const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Limpando banco de dados...");
  // Limpamos de baixo para cima nas relações para não dar erro de chave estrangeira
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.mesa.deleteMany();

  console.log("Criando mesas (1 a 8)...");
  const mesas = Array.from({ length: 8 }, (_, i) => ({
    numero: i + 1,
    status: "LIVRE",
  }));
  await prisma.mesa.createMany({ data: mesas });

  console.log("Criando categorias e produtos do Cardápio Comercial...");

  // 1. ENTRADAS
  await prisma.categoria.create({
    data: {
      nome: "Entradas",
      produtos: {
        create: [
          {
            nome: "Batata Frita Rústica",
            descricao: "Acompanha maionese da casa e bacon crocante.",
            preco: 28.0,
            disponivel: true,
          },
          {
            nome: "Dadinhos de Tapioca",
            descricao: "Porção de 12 unidades com geleia de pimenta agridoce.",
            preco: 32.0,
            disponivel: true,
          },
          {
            nome: "Bruschetta Tradicional",
            descricao:
              "Pão italiano tostado, tomate confit, manjericão e parmesão.",
            preco: 25.0,
            disponivel: true,
          },
        ],
      },
    },
  });

  // 2. PRATOS PRINCIPAIS
  await prisma.categoria.create({
    data: {
      nome: "Pratos Principais",
      produtos: {
        create: [
          {
            nome: "Ancho Grelhado",
            descricao: "Corte premium de 300g, acompanha risoto de parmesão.",
            preco: 89.0,
            disponivel: true,
          },
          {
            nome: "Salmão com Ervas",
            descricao:
              "Filé de salmão grelhado, purê de mandioquinha e aspargos salteados.",
            preco: 78.0,
            disponivel: true,
          },
          {
            nome: "Risoto de Funghi",
            descricao:
              "Arroz arbório, mix de cogumelos frescos e azeite trufado.",
            preco: 65.0,
            disponivel: true,
          },
          {
            nome: "Parmegiana Artesanal",
            descricao:
              "Filé mignon empanado, molho rústico, queijo gratinado e fritas.",
            preco: 72.0,
            disponivel: true,
          },
        ],
      },
    },
  });

  // 3. BEBIDAS
  await prisma.categoria.create({
    data: {
      nome: "Bebidas",
      produtos: {
        create: [
          {
            nome: "Suco Natural de Laranja",
            descricao: "Copo 400ml, feito na hora.",
            preco: 12.0,
            disponivel: true,
          },
          {
            nome: "Coca-Cola Original",
            descricao: "Lata 350ml bem gelada.",
            preco: 7.0,
            disponivel: true,
          },
          {
            nome: "Heineken Long Neck",
            descricao: "Cerveja 330ml.",
            preco: 14.0,
            disponivel: true,
          },
          {
            nome: "Soda Italiana Maçã Verde",
            descricao: "Refrescante, com xarope artesanal e água com gás.",
            preco: 16.0,
            disponivel: true,
          },
        ],
      },
    },
  });

  // 4. SOBREMESAS
  await prisma.categoria.create({
    data: {
      nome: "Sobremesas",
      produtos: {
        create: [
          {
            nome: "Petit Gâteau",
            descricao: "Bolo quente de chocolate com sorvete de baunilha.",
            preco: 26.0,
            disponivel: true,
          },
          {
            nome: "Pudim de Leite",
            descricao: "Receita clássica, sem furinhos, com calda de caramelo.",
            preco: 18.0,
            disponivel: true,
          },
        ],
      },
    },
  });

  console.log("✅ Banco de dados populado com sucesso (Seed comercial)!");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao rodar o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
