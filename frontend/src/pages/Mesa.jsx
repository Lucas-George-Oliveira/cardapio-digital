import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  Utensils,
  ShoppingBag,
  Bell,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff,
  Plus,
  Minus,
  Trash2,
  X,
  ChevronRight,
  Send,
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
  const [cliquesLogo, setCliquesLogo] = useState(0); // Easter egg: 5 cliques para reconfigurar

  const [categorias, setCategorias] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [comanda, setComanda] = useState({ pedidos: [], total_acumulado: 0 });

  const [estadoMesa, setEstadoMesa] = useState("LIVRE");
  const [conectado, setConectado] = useState(socket.connected);

  // Estados de Modais e UI
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidadeModal, setQuantidadeModal] = useState(1);
  const [observacaoModal, setObservacaoModal] = useState("");
  const [drawerCarrinhoAberto, setDrawerCarrinhoAberto] = useState(false);
  const [modalComandaAberto, setModalComandaAberto] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);

  useEffect(() => {
    if (!numeroMesa) return;

    if (socket.connected) setConectado(true);
    socket.emit("registrar_mesa", Number(numeroMesa));

    const onConnect = () => setConectado(true);
    const onDisconnect = () => setConectado(false);
    const onLiberarBotoes = () => setEstadoMesa("LIVRE");

    const onContaPaga = () => {
      setEstadoMesa("LIVRE");
      carregarComanda();
      alert("✅ Conta paga com sucesso! A mesa foi liberada.");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("liberar_botoes_atendimento", onLiberarBotoes);
    socket.on("conta_paga", onContaPaga);

    // Buscar Cardápio
    fetch(
      "https://upgraded-funicular-v6r4vv57pvrq3pw4v-3000.app.github.dev/api/menu",
    )
      .then((res) => res.json())
      .then((data) => {
        setCategorias(data);
        if (data.length > 0) setCategoriaAtiva(data[0].id);
      })
      .catch((err) => console.error("Erro ao buscar cardápio:", err));

    carregarComanda();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("liberar_botoes_atendimento", onLiberarBotoes);
      socket.off("conta_paga", onContaPaga);
    };
  }, [numeroMesa]);

  const carregarComanda = () => {
    if (!numeroMesa) return;
    fetch(`http://localhost:3000/api/mesas/${numeroMesa}/comanda`)
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

  // Adicionar ao Carrinho com Modal de Opções
  const abrirModalProduto = (produto) => {
    setProdutoSelecionado(produto);
    setQuantidadeModal(1);
    setObservacaoModal("");
  };

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
        novoCarrinho[indexExistente].quantidade += quantidadeModal;
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
      novo[index].quantidade += delta;
      if (novo[index].quantidade <= 0)
        return novo.filter((_, i) => i !== index);
      return novo;
    });
  };

  const totalCarrinho = carrinho.reduce(
    (acc, item) => acc + item.produto.preco * item.quantidade,
    0,
  );
  const qtdItensCarrinho = carrinho.reduce(
    (acc, item) => acc + item.quantidade,
    0,
  );

  const enviarPedido = () => {
    const pedido = {
      mesa: Number(numeroMesa),
      itens: carrinho,
      total: totalCarrinho,
      status: "Pendente",
    };
    socket.emit("novo_pedido", pedido);
    setCarrinho([]);
    setDrawerCarrinhoAberto(false);
    setTimeout(carregarComanda, 500);
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

  // TELA DE CONFIGURAÇÃO (INSTALADOR / PIN)
  if (!numeroMesa || mostrarConfigPin) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Utensils size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              Configuração do Tablet
            </h2>
            <p className="text-sm text-slate-500">
              Insira as credenciais técnicas para parear a mesa.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Número da Mesa
              </label>
              <input
                type="number"
                placeholder="Ex: 04"
                value={inputMesa}
                onChange={(e) => setInputMesa(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                PIN Administrativo
              </label>
              <input
                type="password"
                placeholder="••••"
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-bold text-slate-700"
              />
            </div>
            <button
              onClick={salvarConfiguracaoMesa}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              Vincular Aparelho
            </button>
            {mostrarConfigPin && (
              <button
                onClick={() => setMostrarConfigPin(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-sm transition-all"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none pb-24">
      {/* BANNER DE DESCONEXÃO DE REDE */}
      {!conectado && (
        <div className="bg-rose-500 text-white text-xs font-bold py-2 px-4 text-center fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 shadow-md animate-pulse">
          <WifiOff size={16} /> Aguardando conexão com o restaurante...
        </div>
      )}

      {/* CABEÇALHO FIXO PROFISSIONAL */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo / Número da Mesa com Easter Egg (5 cliques) */}
          <div
            onClick={lidarComCliqueLogo}
            className="flex items-center gap-3 cursor-pointer group"
            title="Toque 5 vezes para reconfigurar"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:bg-emerald-600 transition-colors">
              {numeroMesa}
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm leading-tight">
                Cardápio Digital
              </h1>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${conectado ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
                />
                <span className="text-xs text-slate-400 font-medium">
                  Mesa {numeroMesa} • {conectado ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Botões do Topo (Comanda e Carrinho Rápido) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalComandaAberto(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors border border-slate-200"
            >
              <Receipt size={18} className="text-slate-500" />
              <span>Minha Conta</span>
              {comanda.total_acumulado > 0 && (
                <span className="bg-slate-900 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  R$ {comanda.total_acumulado.toFixed(2)}
                </span>
              )}
            </button>

            <button
              onClick={() => setDrawerCarrinhoAberto(true)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all"
            >
              <ShoppingBag size={18} />
              <span className="hidden sm:inline">Carrinho</span>
              {qtdItensCarrinho > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-sm">
                  {qtdItensCarrinho}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* BARRA HORIZONTAL DE CATEGORIAS (SCROLL SUAVE) */}
        <div className="bg-slate-50/80 backdrop-blur border-t border-slate-100 px-4 py-2.5 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto flex gap-2">
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  categoriaAtiva === cat.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200/80"
                }`}
              >
                {cat.nome}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* CORPO DO CARDÁPIO */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-8">
        {categorias
          .filter((cat) => !categoriaAtiva || cat.id === categoriaAtiva)
          .map((categoria) => (
            <section key={categoria.id} className="space-y-4">
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-600 rounded-full" />
                {categoria.nome}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoria.produtos.map((produto) => (
                  <div
                    key={produto.id}
                    onClick={() => abrirModalProduto(produto)}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer flex gap-4 group relative overflow-hidden"
                  >
                    {/* Foto Ilustrativa Aspect-Square com Placeholder de Comida */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-300 font-bold overflow-hidden relative border border-slate-100">
                      <Utensils
                        size={28}
                        className="text-slate-400 group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 text-base leading-snug group-hover:text-emerald-600 transition-colors line-clamp-1">
                          {produto.nome}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          Delicioso preparo fresco da casa, temperado com
                          ingredientes selecionados.
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="font-black text-slate-900 text-base">
                          R$ {produto.preco.toFixed(2)}
                        </span>
                        <button className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-700 flex items-center justify-center transition-colors shadow-xs">
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
      </main>

      {/* BARRA INFERIOR FIXA DE ATENDIMENTO (MÁQUINA DE ESTADOS S7/S8) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-lg z-30 px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button
            onClick={chamarGarcom}
            disabled={!conectado || estadoMesa !== "LIVRE"}
            className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-sm ${
              estadoMesa === "AGUARDANDO_GARCOM"
                ? "bg-amber-500 text-white animate-pulse cursor-not-allowed"
                : "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200"
            }`}
          >
            {estadoMesa === "AGUARDANDO_GARCOM" ? (
              <>
                <Clock size={18} className="animate-spin" />
                <span>Garçom a caminho...</span>
              </>
            ) : (
              <>
                <Bell size={18} />
                <span>Chamar Garçom</span>
              </>
            )}
          </button>

          <button
            onClick={pedirConta}
            disabled={!conectado || estadoMesa !== "LIVRE"}
            className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-sm ${
              estadoMesa === "AGUARDANDO_CONTA"
                ? "bg-rose-500 text-white animate-pulse cursor-not-allowed"
                : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
            }`}
          >
            {estadoMesa === "AGUARDANDO_CONTA" ? (
              <>
                <Clock size={18} className="animate-spin" />
                <span>Conta solicitada...</span>
              </>
            ) : (
              <>
                <Receipt size={18} />
                <span>Pedir a Conta</span>
              </>
            )}
          </button>
        </div>
      </footer>

      {/* MODAL DE PERSONALIZAÇÃO DO PRODUTO (OBSERVAÇÕES) */}
      {produtoSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Adicionar Item
                </span>
                <h3 className="text-xl font-black text-slate-800">
                  {produtoSelecionado.nome}
                </h3>
              </div>
              <button
                onClick={() => setProdutoSelecionado(null)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <span className="text-2xl font-black text-slate-900">
                  R$ {produtoSelecionado.preco.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Alguma observação para a cozinha?
                </label>
                <textarea
                  rows={3}
                  value={observacaoModal}
                  onChange={(e) => setObservacaoModal(e.target.value)}
                  placeholder="Ex: Sem cebola, gelo e limão à parte..."
                  className="w-full p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-700 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="font-bold text-slate-700">Quantidade</span>
                <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-2xl">
                  <button
                    onClick={() =>
                      setQuantidadeModal(Math.max(1, quantidadeModal - 1))
                    }
                    className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-slate-700 font-bold hover:bg-slate-50"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="font-black text-lg w-6 text-center text-slate-800">
                    {quantidadeModal}
                  </span>
                  <button
                    onClick={() => setQuantidadeModal(quantidadeModal + 1)}
                    className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-slate-700 font-bold hover:bg-slate-50"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={confirmarAdicaoCarrinho}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>
                  Adicionar • R${" "}
                  {(produtoSelecionado.preco * quantidadeModal).toFixed(2)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DO CARRINHO */}
      {drawerCarrinhoAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <ShoppingBag size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800">
                  Seu Carrinho
                </h3>
              </div>
              <button
                onClick={() => setDrawerCarrinhoAberto(false)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {carrinho.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-3">
                  <ShoppingBag
                    size={48}
                    className="mx-auto stroke-1 text-slate-300"
                  />
                  <p className="font-semibold">Seu carrinho está vazio.</p>
                </div>
              ) : (
                carrinho.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800">
                          {item.produto.nome}
                        </h4>
                        {item.observacao && (
                          <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md mt-1 inline-block">
                            Obs: {item.observacao}
                          </p>
                        )}
                      </div>
                      <span className="font-black text-slate-900">
                        R$ {(item.produto.preco * item.quantidade).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl border border-slate-200">
                        <button
                          onClick={() => alterarQuantidadeCarrinho(index, -1)}
                          className="text-slate-500 hover:text-slate-800"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-bold text-sm w-4 text-center">
                          {item.quantidade}
                        </span>
                        <button
                          onClick={() => alterarQuantidadeCarrinho(index, 1)}
                          className="text-slate-500 hover:text-slate-800"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {carrinho.length > 0 && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-slate-600 font-medium">
                  <span>Subtotal</span>
                  <span className="font-black text-slate-900 text-lg">
                    R$ {totalCarrinho.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={enviarPedido}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  <span>Enviar Pedido para Cozinha</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL MINHA CONTA / EXTRATO */}
      {modalComandaAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="text-emerald-600" size={24} />
                <h3 className="text-lg font-black text-slate-800">
                  Resumo da Comanda
                </h3>
              </div>
              <button
                onClick={() => setModalComandaAberto(false)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {comanda.pedidos.length === 0 ? (
                <p className="text-center text-slate-400 py-10">
                  Nenhum pedido registrado nesta mesa ainda.
                </p>
              ) : (
                comanda.pedidos.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                      <span>Pedido #{p.id}</span>
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {p.status}
                      </span>
                    </div>
                    {p.itens.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm text-slate-700"
                      >
                        <span>
                          {item.quantidade}x {item.produto.nome}
                        </span>
                        <span className="font-semibold">
                          R${" "}
                          {(item.preco_unitario * item.quantidade).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-600">Total Acumulado</span>
              <span className="font-black text-2xl text-slate-900">
                R$ {comanda.total_acumulado.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
