const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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

module.exports = { getMenu };
