const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/:numero/comanda", async (req, res) => {
  try {
    const numero = parseInt(req.params.numero);

    const mesa = await prisma.mesa.findFirst({
      where: { numero: numero },
      include: {
        pedidos: {
          where: { status: { not: "Finalizado" } },
          include: { itens: { include: { produto: true } } },
        },
      },
    });

    if (!mesa) return res.status(404).json({ error: "Mesa não encontrada" });

    // GARANTIA MATEMÁTICA: Força a soma como Float (Número) para não dar zero ou string
    const totalComanda = mesa.pedidos.reduce(
      (acc, pedido) => acc + parseFloat(pedido.total || 0),
      0,
    );

    res.json({
      status_mesa: mesa.status,
      pedidos: mesa.pedidos,
      total_acumulado: totalComanda,
    });
  } catch (error) {
    console.error("❌ Erro na rota de comanda:", error);
    res.status(500).json({ error: "Erro ao buscar comanda" });
  }
});

module.exports = router;
