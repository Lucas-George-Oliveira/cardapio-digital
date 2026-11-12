const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Rota Pública (Para a Mesa - Mostra apenas os disponíveis)
const getMenu = async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({
      include: {
        produtos: {
          where: { disponivel: true },
        },
      },
    });
    res.json(categorias);
  } catch (error) {
    console.error("Erro ao buscar cardápio:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Nova Rota Admin (Para o Balcão - Mostra TODOS os produtos)
const getMenuAdmin = async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({
      include: {
        produtos: true, // Sem o 'where', traz absolutamente tudo
      },
    });
    res.json(categorias);
  } catch (error) {
    console.error("Erro ao buscar cardápio admin:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = { getMenu, getMenuAdmin };
