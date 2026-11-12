const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const menuRoutes = require("./routes/menuRoutes");

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);
app.use(express.json());

// Rotas REST
app.use("/api/menu", menuRoutes);

// Configuração do WebSocket
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Memória temporária para evitar spam: { mesa_id: { acao: timestamp_em_ms } }
const controleSpam = {};
const COOLDOWN_MS = 60000; // 1 minuto de intervalo obrigatório

function verificarSpam(mesa, acao) {
  const agora = Date.now();
  if (!controleSpam[mesa]) controleSpam[mesa] = {};

  const ultimoRegistro = controleSpam[mesa][acao] || 0;

  if (agora - ultimoRegistro < COOLDOWN_MS) {
    return true; // Bloqueia: é spam!
  }

  controleSpam[mesa][acao] = agora;
  return false; // Permite a ação
}

io.on("connection", (socket) => {
  console.log(`[WS] Novo dispositivo conectado: ${socket.id}`);

  socket.on("novo_pedido", (pedido) => {
    // Pedidos não bloqueamos com spam rígido para não impedir compras seguidas,
    // mas em produção validaríamos se o carrinho está vazio.
    console.log(`[WS] Novo pedido recebido da Mesa ${pedido.mesa}`);
    io.emit("novo_pedido", pedido);
  });

  socket.on("chamar_garcom", (dados) => {
    if (verificarSpam(dados.mesa, "chamar_garcom")) {
      return socket.emit("feedback_servidor", {
        erro: true,
        mensagem: "O garçom já foi chamado e está a caminho.",
      });
    }
    console.log(`[WS] Mesa ${dados.mesa} chamando garçom`);
    io.emit("chamar_garcom", dados);
    socket.emit("feedback_servidor", {
      erro: false,
      mensagem: "Garçom chamado com sucesso!",
    });
  });

  socket.on("pedir_conta", (dados) => {
    if (verificarSpam(dados.mesa, "pedir_conta")) {
      return socket.emit("feedback_servidor", {
        erro: true,
        mensagem: "A conta já foi solicitada. Aguarde um momento.",
      });
    }
    console.log(`[WS] Mesa ${dados.mesa} pedindo a conta`);
    io.emit("pedir_conta", dados);
    socket.emit("feedback_servidor", {
      erro: false,
      mensagem: "Conta solicitada. Em breve iremos até a mesa.",
    });
  });

  socket.on("disconnect", () => {
    console.log(`[WS] Dispositivo desconectado: ${socket.id}`);
  });
});

app.set("io", io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} (Aceitando conexões LAN)`);
});
