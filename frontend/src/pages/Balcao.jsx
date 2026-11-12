import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import {
  LayoutGrid,
  ChefHat,
  Package,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Play,
  Check,
} from "lucide-react";

const socket = io(
  "https://upgraded-funicular-v6r4vv57pvrq3pw4v-3000.app.github.dev/",
  { transports: ["websocket"] },
);

export default function Balcao() {
  const [abaAtiva, setAbaAtiva] = useState("SALAO"); // SALAO, KDS, ESTOQUE
  const [conectado, setConectado] = useState(socket.connected);
  const [somAtivado, setSomAtivado] = useState(false);
  const [agora, setAgora] = useState(Date.now());

  // Estados de Dados
  const [mesasOnline, setMesasOnline] = useState([]);
  const [chamados, setChamados] = useState([]);
  const [pedidosCozinha, setPedidosCozinha] = useState([]);
  const [menuEstoque, setMenuEstoque] = useState([]);

  // Configuração das mesas físicas do restaurante (Exemplo de 8 mesas)
  const totalMesas = [1, 2, 3, 4, 5, 6, 7, 8];

  // Dispara um bip suave e profissional
  const tocarBip = useCallback(() => {
    if (!somAtivado) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Nota lá (A5)
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Erro ao tocar som", e);
    }
  }, [somAtivado]);

  useEffect(() => {
    // Relógio interno para atualizar os cronômetros do KDS a cada 30 segundos
    const timer = setInterval(() => setAgora(Date.now()), 30000);

    // Busca inicial do cardápio para aba de Estoque
    fetch(
      "https://upgraded-funicular-v6r4vv57pvrq3pw4v-3000.app.github.dev/api/menu/admin",
    )
      .then((res) => res.json())
      .then((data) => setMenuEstoque(data))
      .catch((err) => console.error("Erro cardápio:", err));

    // Conexão Socket
    if (socket.connected) setConectado(true);
    socket.on("connect", () => setConectado(true));
    socket.on("disconnect", () => setConectado(false));

    socket.on("atualizacao_mesas_online", setMesasOnline);

    socket.on("novo_pedido", (pedido) => {
      tocarBip();
      setPedidosCozinha((prev) => [
        ...prev,
        {
          ...pedido,
          id_local: Date.now(),
          recebidoEm: Date.now(),
          statusLocal: "PENDENTE",
        },
      ]);
    });

    socket.on("novo_chamado", (dados) => {
      tocarBip();
      setChamados((prev) => {
        const filtrado = prev.filter((c) => c.mesa !== dados.mesa);
        return [...filtrado, dados];
      });
    });

    socket.on("chamado_concluido", (dados) => {
      setChamados((prev) => prev.filter((c) => c.mesa !== dados.mesa));
    });

    return () => {
      clearInterval(timer);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("atualizacao_mesas_online");
      socket.off("novo_pedido");
      socket.off("novo_chamado");
      socket.off("chamado_concluido");
    };
  }, [tocarBip]);

  // Ações do Salão
  const marcarAtendido = (mesaNumero) =>
    socket.emit("marcar_atendido", { mesa: mesaNumero });
  const fecharConta = (mesaNumero) =>
    socket.emit("fechar_conta", { mesa: mesaNumero });

  // Ações do KDS (Cozinha)
  const alterarStatusPedido = (idLocal, novoStatus) => {
    setPedidosCozinha((prev) =>
      prev.map((p) =>
        p.id_local === idLocal ? { ...p, statusLocal: novoStatus } : p,
      ),
    );
    // Se foi entregue, removemos da tela após 2 segundos
    if (novoStatus === "ENTREGUE") {
      setTimeout(() => {
        setPedidosCozinha((prev) => prev.filter((p) => p.id_local !== idLocal));
      }, 2000);
    }
  };

  // Ações do Estoque (Visual por enquanto, emitiria socket ou fetch PUT na próxima sprint)
  const toggleProduto = (categoriaId, produtoId) => {
    setMenuEstoque((prev) =>
      prev.map((cat) => {
        if (cat.id === categoriaId) {
          return {
            ...cat,
            produtos: cat.produtos.map((p) => {
              if (p.id === produtoId) {
                const novoStatus = !p.disponivel;
                // Dispara o evento pro backend salvar no banco
                socket.emit("toggle_estoque", {
                  produtoId: p.id,
                  disponivel: novoStatus,
                });
                return { ...p, disponivel: novoStatus };
              }
              return p;
            }),
          };
        }
        return cat;
      }),
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans overflow-hidden">
      {/* SIDEBAR NAVEGAÇÃO */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black text-white tracking-tight">
            Painel Gestor
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${conectado ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {conectado ? "Sistema Online" : "Desconectado"}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setAbaAtiva("SALAO")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${abaAtiva === "SALAO" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "hover:bg-slate-800 text-slate-400"}`}
          >
            <LayoutGrid size={20} /> Mapa do Salão
            {chamados.length > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">
                {chamados.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setAbaAtiva("KDS")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${abaAtiva === "KDS" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-slate-800 text-slate-400"}`}
          >
            <ChefHat size={20} /> Fila da Cozinha
            {pedidosCozinha.filter((p) => p.statusLocal !== "ENTREGUE").length >
              0 && (
              <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {
                  pedidosCozinha.filter((p) => p.statusLocal !== "ENTREGUE")
                    .length
                }
              </span>
            )}
          </button>

          <button
            onClick={() => setAbaAtiva("ESTOQUE")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${abaAtiva === "ESTOQUE" ? "bg-slate-700 text-white shadow-lg shadow-slate-900/50" : "hover:bg-slate-800 text-slate-400"}`}
          >
            <Package size={20} /> Cardápio / Estoque
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => setSomAtivado(!somAtivado)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all border ${somAtivado ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" : "border-slate-700 text-slate-500 hover:bg-slate-800"}`}
          >
            {somAtivado ? <Volume2 size={20} /> : <VolumeX size={20} />}
            {somAtivado ? "Alertas Ativados" : "Ativar Áudio"}
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        {/* ABA 1: MAPA DO SALÃO */}
        {abaAtiva === "SALAO" && (
          <div className="p-8 overflow-y-auto h-full animate-fadeIn">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <LayoutGrid className="text-emerald-600" /> Gestão de Mesas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {totalMesas.map((numero) => {
                const isOnline = mesasOnline.includes(numero);
                const chamado = chamados.find((c) => c.mesa === numero);

                let corBorda = "border-slate-200";
                let corFundo = "bg-white";
                let statusTexto = "LIVRE";
                let StatusIcon = WifiOff;

                if (isOnline) {
                  statusTexto = "ONLINE";
                  StatusIcon = Wifi;
                  corBorda = "border-emerald-200";
                }

                if (chamado?.tipo === "GARCOM") {
                  corBorda = "border-amber-400";
                  corFundo = "bg-amber-50";
                  statusTexto = "CHAMOU GARÇOM";
                  StatusIcon = AlertTriangle;
                } else if (chamado?.tipo === "CONTA") {
                  corBorda = "border-rose-400";
                  corFundo = "bg-rose-50";
                  statusTexto = "PEDIU A CONTA";
                  StatusIcon = Clock;
                }

                return (
                  <div
                    key={numero}
                    className={`rounded-2xl border-2 p-5 flex flex-col gap-4 shadow-sm transition-all ${corBorda} ${corFundo}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-3xl font-black text-slate-800">
                          Mesa {numero}
                        </h3>
                        <div
                          className={`flex items-center gap-1.5 text-xs font-bold mt-1 ${chamado ? (chamado.tipo === "CONTA" ? "text-rose-600" : "text-amber-600") : isOnline ? "text-emerald-600" : "text-slate-400"}`}
                        >
                          <StatusIcon
                            size={14}
                            className={chamado ? "animate-pulse" : ""}
                          />{" "}
                          {statusTexto}
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 flex flex-col gap-2">
                      {chamado?.tipo === "GARCOM" && (
                        <button
                          onClick={() => marcarAtendido(numero)}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={18} /> Atendido
                        </button>
                      )}

                      {chamado?.tipo === "CONTA" && (
                        <div className="space-y-3">
                          <div className="bg-white p-3 rounded-xl border border-rose-100 text-center">
                            <span className="block text-xs font-bold text-slate-400 uppercase">
                              Total a receber
                            </span>
                            <span className="text-xl font-black text-slate-900">
                              R${" "}
                              {chamado.total
                                ? chamado.total.toFixed(2)
                                : "0.00"}
                            </span>
                          </div>
                          <button
                            onClick={() => fecharConta(numero)}
                            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
                          >
                            💲 Encerrar Mesa
                          </button>
                        </div>
                      )}

                      {!chamado && (
                        <button
                          onClick={() => fecharConta(numero)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                        >
                          Limpar Sessão
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA 2: KDS COZINHA */}
        {abaAtiva === "KDS" && (
          <div className="p-8 overflow-y-auto h-full bg-slate-900 animate-fadeIn">
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
              <ChefHat className="text-blue-400" /> Fila de Preparo (KDS)
            </h2>

            {pedidosCozinha.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
                <ChefHat size={64} className="opacity-20 mb-4" />
                <p className="font-bold text-lg">
                  Nenhum pedido na fila no momento.
                </p>
              </div>
            ) : (
              <div className="flex flex-nowrap gap-6 overflow-x-auto pb-8 no-scrollbar items-start">
                {pedidosCozinha
                  .filter((p) => p.statusLocal !== "ENTREGUE")
                  .map((pedido) => {
                    const minutosAtras = Math.floor(
                      (agora - pedido.recebidoEm) / 60000,
                    );
                    const isAtrasado = minutosAtras >= 15;

                    return (
                      <div
                        key={pedido.id_local}
                        className={`min-w-[320px] max-w-[320px] bg-white rounded-2xl flex flex-col overflow-hidden shadow-xl border-t-8 ${pedido.statusLocal === "PREPARANDO" ? "border-blue-500" : isAtrasado ? "border-rose-600 animate-pulse" : "border-amber-400"}`}
                      >
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                              Mesa
                            </span>
                            <span className="text-3xl font-black text-slate-900 leading-none">
                              {pedido.mesa}
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm ${isAtrasado ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-700"}`}
                          >
                            <Clock size={16} /> {minutosAtras} min
                          </div>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-white">
                          {pedido.itens.map((item, idx) => (
                            <div
                              key={idx}
                              className="border-b border-slate-50 pb-3 last:border-0 last:pb-0"
                            >
                              <div className="flex items-start gap-3">
                                <span className="bg-slate-900 text-white font-black w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                                  {item.quantidade}
                                </span>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-lg leading-tight">
                                    {item.produto.nome}
                                  </h4>
                                  {item.observacao && (
                                    <p className="text-sm text-rose-600 font-semibold mt-1 flex items-center gap-1">
                                      <AlertTriangle size={14} /> Obs:{" "}
                                      {item.observacao}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                          {pedido.statusLocal === "PENDENTE" ? (
                            <button
                              onClick={() =>
                                alterarStatusPedido(
                                  pedido.id_local,
                                  "PREPARANDO",
                                )
                              }
                              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-xl shadow-lg flex items-center justify-center gap-2"
                            >
                              <Play size={20} fill="currentColor" /> Iniciar
                              Preparo
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                alterarStatusPedido(pedido.id_local, "ENTREGUE")
                              }
                              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-xl shadow-lg flex items-center justify-center gap-2"
                            >
                              <Check size={24} strokeWidth={3} /> Marcar
                              Entregue
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ABA 3: ESTOQUE E CARDÁPIO */}
        {abaAtiva === "ESTOQUE" && (
          <div className="p-8 overflow-y-auto h-full animate-fadeIn max-w-5xl mx-auto w-full">
            <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
              <Package className="text-slate-600" /> Controle de Estoque Rápido
            </h2>
            <p className="text-slate-500 mb-8 font-medium">
              Pause produtos esgotados para que os clientes não consigam fazer o
              pedido no tablet.
            </p>

            <div className="space-y-8">
              {menuEstoque.map((categoria) => (
                <div
                  key={categoria.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm"
                >
                  <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-4">
                    {categoria.nome}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoria.produtos.map((produto) => (
                      <div
                        key={produto.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100"
                      >
                        <div>
                          <span
                            className={`font-bold text-lg block ${produto.disponivel ? "text-slate-800" : "text-slate-400 line-through"}`}
                          >
                            {produto.nome}
                          </span>
                          <span className="text-slate-500 text-sm font-semibold">
                            R$ {produto.preco.toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            toggleProduto(categoria.id, produto.id)
                          }
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${produto.disponivel ? "bg-emerald-500" : "bg-slate-300"}`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${produto.disponivel ? "translate-x-7" : "translate-x-1"}`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
