const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const menuRoutes = require("./routes/menuRoutes");
const mesaRoutes = require("./routes/mesaRoutes");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use("/api/menu", menuRoutes);
app.use("/api/mesas", mesaRoutes);

const io = new Server(server, { cors: { origin: "*" } });
const mesasOnline = new Set();

io.on("connection", (socket) => {
  let mesaDesteSocket = null;

  socket.on("registrar_mesa", async (numeroMesa) => {
    mesaDesteSocket = numeroMesa;
    socket.join(`sala_mesa_${numeroMesa}`);
    mesasOnline.add(numeroMesa);
    io.emit("atualizacao_mesas_online", Array.from(mesasOnline));
  });

  // 1. NOVO PEDIDO - Gravação blindada no banco
  socket.on("novo_pedido", async (pedido) => {
    console.log(`[WS] 🍔 PEDIDO: Mesa ${pedido.mesa} (R$ ${pedido.total})`);
    try {
      const mesaDb = await prisma.mesa.findFirst({
        where: { numero: Number(pedido.mesa) },
      });
      if (mesaDb) {
        await prisma.pedido.create({
          data: {
            total: parseFloat(pedido.total), // Força conversão para número
            status: "Pendente",
            mesa: { connect: { id: mesaDb.id } },
            itens: {
              create: pedido.itens.map((item) => ({
                quantidade: Number(item.quantidade), // Força conversão
                preco_unitario: parseFloat(item.produto.preco),
                produto: { connect: { id: Number(item.produto.id) } },
              })),
            },
          },
        });
        console.log(
          `[WS] ✅ Pedido da Mesa ${pedido.mesa} gravado no banco de dados!`,
        );
      }
    } catch (e) {
      // Se aparecer isso no terminal, o nome da relação no schema.prisma está diferente!
      console.error("\n❌ ERRO FATAL AO GRAVAR PEDIDO NO PRISMA:");
      console.error(e.message);
      console.error("------------------------------------------\n");
    }

    io.emit("novo_pedido", pedido);
  });

  socket.on("chamar_garcom", async (dados) => {
    await prisma.mesa.updateMany({
      where: { numero: dados.mesa },
      data: { status: "AGUARDANDO_GARCOM" },
    });
    io.emit("novo_chamado", {
      mesa: dados.mesa,
      tipo: "GARCOM",
      hora: dados.hora,
      status: "AGUARDANDO_GARCOM",
    });
  });

  // 2. PEDIR CONTA - Soma com garantia de tipo Float
  socket.on("pedir_conta", async (dados) => {
    await prisma.mesa.updateMany({
      where: { numero: dados.mesa },
      data: { status: "AGUARDANDO_CONTA" },
    });

    const mesaDb = await prisma.mesa.findFirst({
      where: { numero: dados.mesa },
      include: {
        pedidos: {
          where: { status: { not: "Finalizado" } },
          include: { itens: { include: { produto: true } } },
        },
      },
    });

    // Soma convertendo para float
    const totalComanda =
      mesaDb && mesaDb.pedidos
        ? mesaDb.pedidos.reduce((acc, p) => acc + parseFloat(p.total || 0), 0)
        : 0;

    io.emit("novo_chamado", {
      mesa: dados.mesa,
      tipo: "CONTA",
      hora: dados.hora,
      status: "AGUARDANDO_CONTA",
      pedidos: mesaDb ? mesaDb.pedidos : [],
      total: totalComanda,
    });
  });

  socket.on("marcar_atendido", async ({ mesa }) => {
    await prisma.mesa.updateMany({
      where: { numero: mesa },
      data: { status: "LIVRE" },
    });
    io.emit("chamado_concluido", { mesa });
    io.to(`sala_mesa_${mesa}`).emit("liberar_botoes_atendimento");
  });

  // 3. FECHAR MESA: Recebe o dinheiro e limpa a sessão
  socket.on("fechar_conta", async ({ mesa }) => {
    console.log(`[WS] 💰 Fechando conta da Mesa ${mesa}.`);

    const mesaDb = await prisma.mesa.findFirst({ where: { numero: mesa } });
    if (mesaDb) {
      // Altera a chave para mesa_id conforme exigido pelo schema do Prisma
      await prisma.pedido.updateMany({
        where: { mesa_id: mesaDb.id, status: { not: "Finalizado" } },
        data: { status: "Finalizado" },
      });
    }

    // Libera a mesa
    await prisma.mesa.updateMany({
      where: { numero: mesa },
      data: { status: "LIVRE" },
    });

    io.emit("chamado_concluido", { mesa });
    io.to(`sala_mesa_${mesa}`).emit("conta_paga"); // Avisa o tablet para recarregar
  });

  socket.on("disconnect", () => {
    if (mesaDesteSocket) {
      mesasOnline.delete(mesaDesteSocket);
      io.emit("atualizacao_mesas_online", Array.from(mesasOnline));
    }
  });
});

const PORT = 3000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor na porta ${PORT}`),
);
