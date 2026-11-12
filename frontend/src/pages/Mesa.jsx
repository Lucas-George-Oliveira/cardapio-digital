import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import {
  Utensils,
  ShoppingBag,
  Bell,
  Receipt,
  Clock,
  WifiOff,
  Plus,
  Minus,
  X,
  Send,
  AlertCircle,
} from "lucide-react";

const socket = io(
  "https://upgraded-funicular-v6r4vv57pvrq3pw4v-3000.app.github.dev/",
  { transports: ["websocket"] },
);

export default function Mesa() {
  const [numeroMesa, setNumeroMesa] = useState(
    localStorage.getItem("mesa_numero") || null,
  );
  const [inputMesa, setInputMesa] = useState("");
  const [inputPin, setInputPin] = useState("");
  const [mostrarConfigPin, setMostrarConfigPin] = useState(false);
  const [cliquesLogo, setCliquesLogo] = useState(0);

  const [categorias, setCategorias] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [comanda, setComanda] = useState({ pedidos: [], total_acumulado: 0 });

  const [estadoMesa, setEstadoMesa] = useState("LIVRE");
  const [conectado, setConectado] = useState(socket.connected);

  // Estados de Modais e UI
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidadeModal, setQuantidadeModal] = useState(1);
  const [observacaoModal, setObservacaoModal] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);
  const [modalExtratoAberto, setModalExtratoAberto] = useState(false);

  // Ref para calcular o tempo offline (Sincronização Inteligente - Sprint 10)
  const tempoOfflineRef = useRef(null);

  useEffect(() => {
    if (!numeroMesa) return;

    if (socket.connected) setConectado(true);
    socket.emit("registrar_mesa", Number(numeroMesa));

    const carregarCardapio = () => {
      fetch(
        "https://upgraded-funicular-v6r4vv57pvrq3pw4v-3000.app.github.dev/api/menu",
      )
        .then((res) => res.json())
        .then((data) => {
          setCategorias(data);
          setCategoriaAtiva(
            (prev) => prev || (data.length > 0 ? data[0].id : null),
          );
        })
        .catch((err) => console.error("Erro ao buscar cardápio:", err));
    };

    const carregarComanda = () => {
      fetch(
        `https://upgraded-funicular-v6r4vv57pvrq3pw4v-3000.app.github.dev/api/mesas/${numeroMesa}/comanda`,
      )
        .then((res) => res.json())
        .then((data) => {
          setComanda({
            pedidos: data.pedidos || [],
            total_acumulado: data.total_acumulado || 0,
          });
          if (data.status_mesa) setEstadoMesa(data.status_mesa);
        })
        .catch((err) => console.error("Erro ao carregar comanda:", err));
    };

    // Lógica de Sincronização ao Reconectar
    const onConnect = () => {
      setConectado(true);
      if (tempoOfflineRef.current) {
        const tempoOffline = Date.now() - tempoOfflineRef.current;
        // Se ficou mais de 10 segundos sem rede, sincroniza com o servidor
        if (tempoOffline >= 10000) {
          console.log(
            `[Sync] Reconectado após ${Math.round(tempoOffline / 1000)}s. Atualizando dados da mesa...`,
          );
          carregarComanda();
          carregarCardapio();
        }
        tempoOfflineRef.current = null;
      }
    };

    const onDisconnect = () => {
      setConectado(false);
      tempoOfflineRef.current = Date.now(); // Marca a exata hora que caiu a rede
    };

    const onLiberarBotoes = () => setEstadoMesa("LIVRE");

    const onContaPaga = () => {
      setEstadoMesa("LIVRE");
      carregarComanda();
      alert("✅ Conta paga com sucesso! A mesa foi liberada.");
    };

    // Escutando Eventos
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("liberar_botoes_atendimento", onLiberarBotoes);
    socket.on("conta_paga", onContaPaga);
    socket.on("estoque_atualizado", carregarCardapio); // Atualiza se gerente mudar o estoque

    // Fetch inicial
    carregarCardapio();
    carregarComanda();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("liberar_botoes_atendimento", onLiberarBotoes);
      socket.off("conta_paga", onContaPaga);
      socket.off("estoque_atualizado", carregarCardapio);
    };
  }, [numeroMesa]);

  const salvarConfiguracaoMesa = () => {
    if (inputPin !== "1234") return alert("PIN Administrativo incorreto.");
    if (!inputMesa) return alert("Informe o número da mesa.");
    localStorage.setItem("mesa_numero", inputMesa);
    setNumeroMesa(inputMesa);
    setMostrarConfigPin(false);
  };

  const lidarComCliqueLogo = () => {
    setCliquesLogo((prev) => {
      const proximo = prev + 1;
      if (proximo >= 5) {
        setMostrarConfigPin(true);
        return 0;
      }
      return proximo;
    });
  };

  const abrirModalProduto = (produto) => {
    setProdutoSelecionado(produto);
    setQuantidadeModal(1);
    setObservacaoModal("");
  };

  // Lógica Imutável Corrigida para evitar itens duplicados
  const confirmarAdicaoCarrinho = () => {
    if (!produtoSelecionado) return;
    setCarrinho((prev) => {
      const indexExistente = prev.findIndex(
        (item) =>
          item.produto.id === produtoSelecionado.id &&
          item.observacao === observacaoModal,
      );

      if (indexExistente >= 0) {
        const novoCarrinho = [...prev];
        novoCarrinho[indexExistente] = {
          ...novoCarrinho[indexExistente],
          quantidade: novoCarrinho[indexExistente].quantidade + quantidadeModal,
        };
        return novoCarrinho;
      }

      return [
        ...prev,
        {
          produto: produtoSelecionado,
          quantidade: quantidadeModal,
          observacao: observacaoModal,
        },
      ];
    });
    setProdutoSelecionado(null);
  };

  const alterarQuantidadeCarrinho = (index, delta) => {
    setCarrinho((prev) => {
      const novo = [...prev];
      novo[index] = {
        ...novo[index],
        quantidade: novo[index].quantidade + delta,
      };

      if (novo[index].quantidade <= 0)
        return novo.filter((_, i) => i !== index);
      return novo;
    });
  };

  const totalCarrinho = carrinho.reduce(
    (acc, item) => acc + item.produto.preco * item.quantidade,
    0,
  );

  const enviarPedido = () => {
    if (carrinho.length === 0) return;
    const pedido = {
      mesa: Number(numeroMesa),
      itens: carrinho,
      total: totalCarrinho,
      status: "Pendente",
    };
    socket.emit("novo_pedido", pedido);
    setCarrinho([]);
    setTimeout(carregarComanda, 500); // Atualiza o extrato após enviar o pedido
  };

  const chamarGarcom = () => {
    setEstadoMesa("AGUARDANDO_GARCOM");
    socket.emit("chamar_garcom", {
      mesa: Number(numeroMesa),
      hora: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  };

  const pedirConta = () => {
    if (comanda.total_acumulado === 0 && carrinho.length === 0) {
      return alert("Sua comanda está vazia no momento.");
    }
    setEstadoMesa("AGUARDANDO_CONTA");
    socket.emit("pedir_conta", {
      mesa: Number(numeroMesa),
      hora: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  };

  // TELA DE CONFIGURAÇÃO (INSTALADOR)
  if (!numeroMesa || mostrarConfigPin) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Utensils size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Configuração</h2>
          </div>
          <div className="space-y-4">
            <input
              type="number"
              placeholder="Número da Mesa"
              value={inputMesa}
              onChange={(e) => setInputMesa(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-lg font-bold"
            />
            <input
              type="password"
              placeholder="PIN (1234)"
              value={inputPin}
              onChange={(e) => setInputPin(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-lg font-bold"
            />
            <button
              onClick={salvarConfiguracaoMesa}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
            >
              Vincular Tablet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {!conectado && (
        <div className="absolute top-0 left-0 right-0 bg-rose-500 text-white text-xs font-bold py-1.5 flex items-center justify-center gap-2 z-50 animate-pulse">
          <WifiOff size={16} /> Sem conexão com o restaurante. Aguarde...
        </div>
      )}

      {/* COLUNA ESQUERDA: CATEGORIAS */}
      <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div
          onClick={lidarComCliqueLogo}
          className="p-6 border-b border-slate-100 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
          title="Toque 5 vezes para reconfigurar"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md">
            {numeroMesa}
          </div>
          <div>
            <h1 className="font-black text-slate-800 text-base leading-tight">
              Mesa {numeroMesa}
            </h1>
            <span
              className={`text-xs font-bold ${conectado ? "text-emerald-500" : "text-rose-500"}`}
            >
              {conectado ? "• Online" : "• Offline"}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-2 mt-2">
            Menu
          </h3>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaAtiva(cat.id)}
              className={`w-full text-left px-5 py-4 rounded-2xl font-bold transition-all flex items-center justify-between ${
                categoriaAtiva === cat.id
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : "bg-transparent text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      </aside>

      {/* COLUNA CENTRAL: PRODUTOS */}
      <main className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {categorias
            .filter((cat) => !categoriaAtiva || cat.id === categoriaAtiva)
            .map((categoria) => (
              <section key={categoria.id} className="animate-fadeIn">
                <h2 className="text-3xl font-black text-slate-800 mb-8 flex items-center gap-3">
                  {categoria.nome}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-12">
                  {categoria.produtos.map((produto) => (
                    <div
                      key={produto.id}
                      onClick={() => abrirModalProduto(produto)}
                      className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col gap-4 group"
                    >
                      <div className="w-full aspect-video rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-100 overflow-hidden relative">
                        <Utensils
                          size={40}
                          className="text-slate-300 group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>

                      <div className="flex flex-col flex-1 justify-between">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-emerald-600 transition-colors">
                            {produto.nome}
                          </h3>
                          <p className="text-sm text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                            {produto.descricao}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                          <span className="font-black text-slate-900 text-xl">
                            R$ {produto.preco.toFixed(2)}
                          </span>
                          <button className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                            <Plus size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </main>

      {/* COLUNA DIREITA: COMANDA E CARRINHO */}
      <aside className="w-[360px] xl:w-[400px] bg-white border-l border-slate-200 flex flex-col h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Receipt size={20} className="text-emerald-600" />
              Sua Comanda
            </h3>
            <button
              onClick={() => setModalExtratoAberto(true)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider"
            >
              Extrato
            </button>
          </div>
          <div className="flex items-end justify-between mt-4">
            <span className="text-sm text-slate-500 font-bold">
              Total consumido
            </span>
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              <span className="text-lg font-bold text-slate-400 mr-1">R$</span>
              {comanda.total_acumulado.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 no-scrollbar">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
            <ShoppingBag size={20} className="text-emerald-600" />
            Novo Pedido
          </h3>

          {carrinho.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 opacity-70">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                <ShoppingBag size={40} className="stroke-1 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-center px-4">
                Toque nos produtos ao lado para montar seu pedido.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {carrinho.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="pr-2">
                      <h4 className="font-bold text-slate-800 leading-tight">
                        {item.produto.nome}
                      </h4>
                      {item.observacao && (
                        <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md mt-1.5 inline-block">
                          Obs: {item.observacao}
                        </p>
                      )}
                    </div>
                    <span className="font-black text-slate-900 whitespace-nowrap">
                      R$ {(item.produto.preco * item.quantidade).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-50">
                    <button
                      onClick={() =>
                        alterarQuantidadeCarrinho(index, -item.quantidade)
                      }
                      className="text-xs font-bold text-rose-500 flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors"
                    >
                      <X size={14} /> Remover
                    </button>

                    <div className="flex items-center gap-3 bg-slate-50 px-1.5 py-1.5 rounded-xl border border-slate-100">
                      <button
                        onClick={() => alterarQuantidadeCarrinho(index, -1)}
                        className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-slate-600 shadow-xs hover:text-slate-900"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold text-sm w-4 text-center text-slate-800">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => alterarQuantidadeCarrinho(index, 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-slate-600 shadow-xs hover:text-slate-900"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-4 relative z-20">
          {carrinho.length > 0 && (
            <div className="animate-fadeIn">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-500 font-bold text-sm">
                  Subtotal do pedido
                </span>
                <span className="text-xl font-black text-slate-900">
                  R$ {totalCarrinho.toFixed(2)}
                </span>
              </div>
              <button
                onClick={enviarPedido}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Send size={20} />
                <span>Confirmar Pedido</span>
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={chamarGarcom}
              disabled={!conectado || estadoMesa !== "LIVRE"}
              className={`flex-1 py-4 px-2 rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-1.5 transition-all ${
                estadoMesa === "AGUARDANDO_GARCOM"
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse cursor-not-allowed"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {estadoMesa === "AGUARDANDO_GARCOM" ? (
                <>
                  <Clock size={20} className="animate-spin" />
                  <span>A caminho</span>
                </>
              ) : (
                <>
                  <Bell size={20} />
                  <span>Chamar Garçom</span>
                </>
              )}
            </button>

            <button
              onClick={pedirConta}
              disabled={!conectado || estadoMesa !== "LIVRE"}
              className={`flex-1 py-4 px-2 rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-1.5 transition-all ${
                estadoMesa === "AGUARDANDO_CONTA"
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse cursor-not-allowed"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {estadoMesa === "AGUARDANDO_CONTA" ? (
                <>
                  <Clock size={20} className="animate-spin" />
                  <span>Conta pedida</span>
                </>
              ) : (
                <>
                  <Receipt size={20} />
                  <span>Pedir a Conta</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* MODAL DO PRODUTO */}
      {produtoSelecionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 pb-6 border-b border-slate-100 flex items-start justify-between relative">
              <div className="pr-10">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 block">
                  Adicionar Item
                </span>
                <h3 className="text-2xl font-black text-slate-800 leading-tight">
                  {produtoSelecionado.nome}
                </h3>
              </div>
              <button
                onClick={() => setProdutoSelecionado(null)}
                className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors absolute top-6 right-6"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8 flex-1">
              <div>
                <span className="text-3xl font-black text-slate-900">
                  R$ {produtoSelecionado.preco.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-500" />
                  Alguma observação para a cozinha?
                </label>
                <textarea
                  rows={3}
                  value={observacaoModal}
                  onChange={(e) => setObservacaoModal(e.target.value)}
                  placeholder="Ex: Sem cebola, gelo e limão à parte..."
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors text-base text-slate-700 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-700 text-lg">
                  Quantidade
                </span>
                <div className="flex items-center gap-6 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                  <button
                    onClick={() =>
                      setQuantidadeModal(Math.max(1, quantidadeModal - 1))
                    }
                    className="w-12 h-12 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition-colors"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="font-black text-2xl w-6 text-center text-slate-800">
                    {quantidadeModal}
                  </span>
                  <button
                    onClick={() => setQuantidadeModal(quantidadeModal + 1)}
                    className="w-12 h-12 rounded-xl bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100">
              <button
                onClick={confirmarAdicaoCarrinho}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <span>Adicionar</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                <span>
                  R$ {(produtoSelecionado.preco * quantidadeModal).toFixed(2)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXTRATO */}
      {modalExtratoAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Receipt size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-800">
                  Extrato da Mesa
                </h3>
              </div>
              <button
                onClick={() => setModalExtratoAberto(false)}
                className="w-10 h-10 rounded-full bg-white hover:bg-slate-200 flex items-center justify-center text-slate-500 shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-white no-scrollbar">
              {comanda.pedidos.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Receipt
                    size={48}
                    className="mx-auto stroke-1 mb-4 opacity-50"
                  />
                  <p className="font-semibold">
                    Nenhum pedido registrado nesta mesa ainda.
                  </p>
                </div>
              ) : (
                comanda.pedidos.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3 relative overflow-hidden"
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${p.status === "Pendente" ? "bg-amber-400" : "bg-emerald-500"}`}
                    />

                    <div className="flex justify-between items-center pl-2">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                        Pedido #{p.id}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-md ${p.status === "Pendente" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="space-y-2 pl-2 mt-3">
                      {p.itens.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm text-slate-700"
                        >
                          <span className="font-medium">
                            <span className="font-bold text-slate-400 mr-2">
                              {item.quantidade}x
                            </span>
                            {item.produto.nome}
                          </span>
                          <span className="font-bold text-slate-900">
                            R${" "}
                            {(item.preco_unitario * item.quantidade).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-slate-900 text-white flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                Total a Pagar
              </span>
              <span className="font-black text-4xl tracking-tight">
                R$ {comanda.total_acumulado.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
