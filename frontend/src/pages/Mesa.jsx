import { useState, useEffect } from "react";
import { io } from "socket.io-client";

// ATENÇÃO: Confirme se este é o link público exato da porta 3000 do seu backend
const socket = io(
  "https://upgraded-funicular-v6r4vv57pvrq3pw4v-3000.app.github.dev/",
  {
    transports: ["websocket", "polling"],
  },
);

export default function Mesa() {
  const [categorias, setCategorias] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [conectado, setConectado] = useState(socket.connected);
  const [toast, setToast] = useState(null);
  const numeroMesa = 1;

  useEffect(() => {
    if (socket.connected) setConectado(true);

    const onConnect = () => setConectado(true);
    const onDisconnect = () => setConectado(false);

    // Quando o servidor mandar o feedback, essa função é ativada
    const onFeedback = (dados) => {
      console.log("Feedback recebido do servidor:", dados); // Para debug
      mostrarToast(dados.mensagem, dados.erro);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("feedback_servidor", onFeedback);

    // ATENÇÃO: Confirme o link público aqui também
    fetch(
      "https://upgraded-funicular-v6r4vv57pvrq3pw4v-3000.app.github.dev/api/menu",
    )
      .then((res) => res.json())
      .then((data) => setCategorias(data))
      .catch((err) => console.error("Erro ao buscar cardápio:", err));

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("feedback_servidor", onFeedback);
    };
  }, []);

  const mostrarToast = (mensagem, isErro = false) => {
    setToast({ mensagem, isErro });
    // Esconde a notificação após 3 segundos
    setTimeout(() => setToast(null), 3000);
  };

  const adicionarItem = (produto) => {
    setCarrinho((prev) => {
      const existe = prev.find((item) => item.produto.id === produto.id);
      if (existe)
        return prev.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
        );
      return [...prev, { produto, quantidade: 1 }];
    });
  };

  const alterarQuantidade = (id, delta) => {
    setCarrinho((prev) =>
      prev
        .map((item) => {
          if (item.produto.id === id)
            return {
              ...item,
              quantidade: Math.max(0, item.quantidade + delta),
            };
          return item;
        })
        .filter((item) => item.quantidade > 0),
    );
  };

  const totalCarrinho = carrinho.reduce(
    (acc, item) => acc + item.produto.preco * item.quantidade,
    0,
  );

  const enviarPedido = () => {
    socket.emit("novo_pedido", {
      mesa: numeroMesa,
      itens: carrinho,
      total: totalCarrinho,
      status: "Pendente",
    });
    setCarrinho([]);
    mostrarToast("✅ Pedido enviado para a cozinha!");
  };

  const chamarGarcom = () => {
    socket.emit("chamar_garcom", {
      mesa: numeroMesa,
      hora: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  };

  const pedirConta = () => {
    socket.emit("pedir_conta", {
      mesa: numeroMesa,
      hora: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  };

  return (
    <div className="mesa-container">
      {/* 1. BANNER DE DESCONEXÃO */}
      {!conectado && (
        <div className="banner-desconectado">
          ⚠️ Aguardando conexão com o restaurante...
        </div>
      )}

      {/* 2. TOAST DE FEEDBACK (O que estava faltando) */}
      {toast && (
        <div
          className={`toast ${toast.isErro ? "toast-erro" : "toast-sucesso"}`}
        >
          {toast.mensagem}
        </div>
      )}

      <div className="menu-area">
        <h1>Cardápio Digital (Mesa {numeroMesa})</h1>
        {categorias.map((categoria) => (
          <div key={categoria.id} className="categoria-section">
            <h2>{categoria.nome}</h2>
            <div className="produtos-grid">
              {categoria.produtos.map((produto) => (
                <div key={produto.id} className="produto-card">
                  <div className="produto-info">
                    <h3>{produto.nome}</h3>
                    <p className="preco">R$ {produto.preco.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => adicionarItem(produto)}
                    className="btn-add"
                    disabled={!conectado}
                  >
                    + Adicionar
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar">
        <div className="carrinho-area">
          <h2>Seu Pedido</h2>
          {carrinho.length === 0 ? (
            <p className="carrinho-vazio">Carrinho vazio</p>
          ) : (
            <div className="carrinho-itens">
              {carrinho.map((item) => (
                <div key={item.produto.id} className="carrinho-item">
                  <span>{item.produto.nome}</span>
                  <div className="controles">
                    <button
                      onClick={() => alterarQuantidade(item.produto.id, -1)}
                    >
                      -
                    </button>
                    <span>{item.quantidade}</span>
                    <button
                      onClick={() => alterarQuantidade(item.produto.id, 1)}
                    >
                      +
                    </button>
                  </div>
                  <span>
                    R$ {(item.produto.preco * item.quantidade).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="total-area">
            <h3>Total: R$ {totalCarrinho.toFixed(2)}</h3>
            <button
              className="btn-enviar-pedido"
              disabled={carrinho.length === 0 || !conectado}
              onClick={enviarPedido}
            >
              Enviar Pedido
            </button>
          </div>
        </div>

        <div className="acoes-area">
          <button
            className="btn-acao btn-garcom"
            onClick={chamarGarcom}
            disabled={!conectado}
          >
            🙋‍♂️ Chamar Garçom
          </button>
          <button
            className="btn-acao btn-conta"
            onClick={pedirConta}
            disabled={!conectado}
          >
            💳 Pedir Conta
          </button>
        </div>
      </div>
    </div>
  );
}
