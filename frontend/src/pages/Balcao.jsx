import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io(
  "https://upgraded-funicular-v6r4vv57pvrq3pw4v-3000.app.github.dev/",
  { transports: ["websocket"] },
);

export default function Balcao() {
  const [chamados, setChamados] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [mesasOnline, setMesasOnline] = useState([]);
  const [conectado, setConectado] = useState(socket.connected);

  useEffect(() => {
    if (socket.connected) setConectado(true);

    socket.on("connect", () => setConectado(true));
    socket.on("disconnect", () => setConectado(false));
    socket.on("atualizacao_mesas_online", setMesasOnline);

    socket.on("novo_pedido", (pedido) =>
      setPedidos((prev) => [...prev, pedido]),
    );

    socket.on("novo_chamado", (dados) => {
      setChamados((prev) => {
        const filtrado = prev.filter((c) => c.mesa !== dados.mesa);
        return [...filtrado, dados];
      });
    });

    socket.on("chamado_concluido", (dados) => {
      setChamados((prev) => prev.filter((c) => c.mesa !== dados.mesa));
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("atualizacao_mesas_online");
      socket.off("novo_pedido");
      socket.off("novo_chamado");
      socket.off("chamado_concluido");
    };
  }, []);

  const marcarAtendido = (mesaNumero) => {
    socket.emit("marcar_atendido", { mesa: mesaNumero });
  };

  const fecharConta = (mesaNumero) => {
    socket.emit("fechar_conta", { mesa: mesaNumero });
  };

  const concluirPedido = (index) => {
    setPedidos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      {!conectado ? (
        <div
          style={{
            background: "#ef4444",
            color: "white",
            padding: 10,
            textAlign: "center",
            fontWeight: "bold",
            marginBottom: 20,
          }}
        >
          ⚠️ Balcão Desconectado!
        </div>
      ) : (
        <div
          style={{
            background: "#10b981",
            color: "white",
            padding: 10,
            textAlign: "center",
            fontWeight: "bold",
            marginBottom: 20,
          }}
        >
          ✅ Balcão Conectado e Operante!
        </div>
      )}

      <h1>Dashboard Operacional e Caixa</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* COLUNA 1: Atendimento e Caixa */}
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 8,
            borderTop: "5px solid #f59e0b",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h2>🚨 Salão e Caixa</h2>
          {chamados.length === 0 ? (
            <p style={{ color: "#64748b" }}>Nenhum chamado pendente.</p>
          ) : (
            chamados.map((c) => (
              <div
                key={c.mesa}
                style={{
                  padding: 15,
                  margin: "10px 0",
                  border: "1px solid #e2e8f0",
                  borderRadius: 5,
                  background: c.tipo === "CONTA" ? "#fef2f2" : "#fffbeb",
                }}
              >
                <h3 style={{ margin: "0 0 5px 0" }}>Mesa {c.mesa}</h3>

                {c.tipo === "GARCOM" ? (
                  <>
                    <p
                      style={{
                        color: "#f59e0b",
                        fontWeight: "bold",
                        margin: "5px 0",
                      }}
                    >
                      🙋‍♂️ Chamou Garçom
                    </p>
                    <button
                      onClick={() => marcarAtendido(c.mesa)}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 15,
                        padding: 10,
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      ✔ Marcar como Atendido
                    </button>
                  </>
                ) : (
                  <>
                    <p
                      style={{
                        color: "#ef4444",
                        fontWeight: "bold",
                        margin: "5px 0",
                      }}
                    >
                      💳 Pediu a Conta
                    </p>

                    {/* EXTRATO DA CONTA RENDERIZADO */}
                    <div
                      style={{
                        background: "#fff",
                        padding: 10,
                        marginTop: 10,
                        borderRadius: 5,
                        border: "1px dashed #cbd5e1",
                      }}
                    >
                      <h4 style={{ margin: "0 0 10px 0", fontSize: 14 }}>
                        Resumo de Consumo:
                      </h4>
                      {c.pedidos && c.pedidos.length > 0 ? (
                        <ul
                          style={{
                            paddingLeft: 15,
                            margin: 0,
                            fontSize: 13,
                            color: "#334155",
                          }}
                        >
                          {c.pedidos.map((p) =>
                            p.itens.map((item) => (
                              <li key={item.id} style={{ marginBottom: 4 }}>
                                {item.quantidade}x {item.produto.nome} - R${" "}
                                {(item.produto.preco * item.quantidade).toFixed(
                                  2,
                                )}
                              </li>
                            )),
                          )}
                        </ul>
                      ) : (
                        <p style={{ fontSize: 13, margin: 0 }}>
                          Nenhum pedido atrelado.
                        </p>
                      )}
                      <div
                        style={{
                          fontWeight: "bold",
                          fontSize: 16,
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: "1px solid #e2e8f0",
                        }}
                      >
                        Total a Pagar: R${" "}
                        {c.total ? c.total.toFixed(2) : "0.00"}
                      </div>
                    </div>

                    <button
                      onClick={() => fecharConta(c.mesa)}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 15,
                        padding: 10,
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      💲 Receber Pagamento e Liberar Mesa
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* COLUNA 2: Pedidos da Cozinha */}
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 8,
            borderTop: "5px solid #3b82f6",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h2>🍔 Cozinha</h2>
          {/* ... A renderização da cozinha continua igualzinha ... */}
          {pedidos.map((p, index) => (
            <div
              key={index}
              style={{
                padding: 15,
                margin: "10px 0",
                border: "1px solid #e2e8f0",
                borderRadius: 5,
                background: "#eff6ff",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", color: "#1e3a8a" }}>
                Mesa {p.mesa}
              </h3>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {p.itens.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: 5 }}>
                    <strong>{item.quantidade}x</strong> {item.produto.nome}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => concluirPedido(index)}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 10,
                  padding: 10,
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                🍽️ Finalizar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
