import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./../App.css";

// Conexão com o servidor.
// ATENÇÃO: No Codespaces, trocaremos isso pela URL pública do backend depois.
// Para testar localmente, usamos o localhost:3000.
const socket = io(
  "https://upgraded-funicular-v6r4vv57pvrq3pw4v-3000.app.github.dev/",
  {
    transports: ["websocket", "polling"],
  },
);

function Balcao() {
  const [pedidos, setPedidos] = useState([]);
  const [chamados, setChamados] = useState([]);
  const [contas, setContas] = useState([]);

  useEffect(() => {
    // Escuta evento de novo pedido
    socket.on("novo_pedido", (pedido) => {
      console.log("Novo pedido recebido:", pedido);
      setPedidos((prev) => [...prev, pedido]);
    });

    // Escuta evento de chamar garçom
    socket.on("chamar_garcom", (dados) => {
      console.log("Garçom chamado pela mesa:", dados.mesa);
      setChamados((prev) => [...prev, dados]);
    });

    // Escuta evento de pedir conta
    socket.on("pedir_conta", (dados) => {
      console.log("Conta pedida pela mesa:", dados.mesa);
      setContas((prev) => [...prev, dados]);
    });

    // Limpa os listeners quando o componente for desmontado
    return () => {
      socket.off("novo_pedido");
      socket.off("chamar_garcom");
      socket.off("pedir_conta");
    };
  }, []);

  return (
    <div className="dashboard-container">
      {/* COLUNA 1: Pedidos Ativos */}
      <div className="coluna">
        <h2>🍔 Pedidos Ativos</h2>
        {pedidos.length === 0 ? <p>Nenhum pedido no momento.</p> : null}
        {pedidos.map((pedido, index) => (
          <div key={index} className="card">
            <strong>Mesa {pedido.mesa}</strong>
            <p>Total: R$ {pedido.total.toFixed(2)}</p>
            <small>Status: {pedido.status}</small>
          </div>
        ))}
      </div>

      {/* COLUNA 2: Chamados de Garçom */}
      <div className="coluna" style={{ borderTop: "4px solid #f59e0b" }}>
        <h2>🙋‍♂️ Chamados</h2>
        {chamados.length === 0 ? <p>Nenhuma mesa chamando.</p> : null}
        {chamados.map((chamado, index) => (
          <div key={index} className="card">
            <strong>Mesa {chamado.mesa} aguardando atendimento.</strong>
            <p>
              <small>{chamado.hora}</small>
            </p>
          </div>
        ))}
      </div>

      {/* COLUNA 3: Contas Solicitadas */}
      <div className="coluna" style={{ borderTop: "4px solid #10b981" }}>
        <h2>💳 Contas</h2>
        {contas.length === 0 ? <p>Nenhuma conta solicitada.</p> : null}
        {contas.map((conta, index) => (
          <div key={index} className="card">
            <strong>Mesa {conta.mesa} pediu a conta.</strong>
            <p>
              <small>{conta.hora}</small>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Balcao;
