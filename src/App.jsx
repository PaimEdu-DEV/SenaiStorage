import { useEffect, useState } from "react";
import { Check, History, Moon, Pencil, Plus, Sun, Trash2 } from "lucide-react";
import "./App.css";
import {
  atualizarProduto,
  buscarLinkAcesso,
  cadastrarMovimentacao,
  cadastrarLinkAcesso,
  cadastrarProduto,
  excluirProduto,
  excluirLinkAcesso,
  listarLinksAcesso,
  listarMovimentacoes,
  listarProdutos,
} from "./crud";
import { firebaseConfigurado } from "./firebaseconfig";

const formularioInicial = {
  nome: "",
  fornecedor: "",
  codigo: "",
  descricao: "",
  quantidadeKg: "",
};

const opcoesDeUso = ["Uso em aula", "Uso em produtos", "Moagem"];
const limiteEstoqueBaixo = 5;
const limiteEstoqueAtencao = 30;
const formularioLinkInicial = {
  nome: "",
  valorTempo: "",
  unidadeTempo: "minutos",
};

function obterStatusEstoque(quantidadeKg) {
  const quantidade = Number(quantidadeKg || 0);

  if (quantidade <= limiteEstoqueBaixo) {
    return {
      classe: "low",
      texto: "Repor estoque",
      descricao: "Estoque baixo. Reposite assim que possivel.",
    };
  }

  if (quantidade <= limiteEstoqueAtencao) {
    return {
      classe: "attention",
      texto: "Ficar atento",
      descricao: "Estoque na faixa de atencao, mas ainda utilizavel.",
    };
  }

  return {
    classe: "good",
    texto: "Estoque bom",
    descricao: "Quantidade confortavel para uso.",
  };
}

function gerarTokenAcesso() {
  return crypto.randomUUID().slice(0, 8);
}

function calcularDuracaoEmMs(valor, unidade) {
  const numero = Number(valor);

  if (unidade === "segundos") {
    return numero * 1000;
  }

  if (unidade === "horas") {
    return numero * 60 * 60 * 1000;
  }

  return numero * 60 * 1000;
}

function formatarData(timestamp) {
  return new Date(timestamp).toLocaleString("pt-BR");
}

function App() {
  const [formulario, setFormulario] = useState(formularioInicial);
  const [produtos, setProdutos] = useState([]);
  const [produtoEditandoId, setProdutoEditandoId] = useState(null);
  const [erro, setErro] = useState("");
  const [modoEscuro, setModoEscuro] = useState(false);
  const [modalUsoAberto, setModalUsoAberto] = useState(false);
  const [modalFichaAberto, setModalFichaAberto] = useState(false);
  const [modalAcessoAberto, setModalAcessoAberto] = useState(false);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [modalTodosProdutosAberto, setModalTodosProdutosAberto] = useState(false);
  const [produtoEmUso, setProdutoEmUso] = useState(null);
  const [etapaUso, setEtapaUso] = useState(1);
  const [tipoDeUso, setTipoDeUso] = useState("");
  const [usoConfirmado, setUsoConfirmado] = useState(false);
  const [buscaProdutoUso, setBuscaProdutoUso] = useState("");
  const [buscaFichaEstoque, setBuscaFichaEstoque] = useState("");
  const [kgRetirado, setKgRetirado] = useState("");
  const [devolucoesFicha, setDevolucoesFicha] = useState({});
  const [erroUso, setErroUso] = useState("");
  const [erroFicha, setErroFicha] = useState("");
  const [linksAcesso, setLinksAcesso] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [formularioLink, setFormularioLink] = useState(formularioLinkInicial);
  const [erroLink, setErroLink] = useState("");
  const [erroHistorico, setErroHistorico] = useState("");
  const [linkCriado, setLinkCriado] = useState("");
  const [acessoCliente, setAcessoCliente] = useState({
    carregando: true,
    link: null,
    erro: "",
  });
  const tokenAcesso = new URLSearchParams(window.location.search).get("acesso");

  const produtosFiltradosParaUso = produtos.filter((produto) => {
    const busca = buscaProdutoUso.toLowerCase().trim();
    const nome = String(produto.nome || "").toLowerCase();
    const codigo = String(produto.codigo || "").toLowerCase();

    return nome.includes(busca) || codigo.includes(busca);
  });
  const produtosFiltradosFicha = produtos.filter((produto) => {
    const busca = buscaFichaEstoque.toLowerCase().trim();
    const nome = String(produto.nome || "").toLowerCase();
    const codigo = String(produto.codigo || "").toLowerCase();

    return nome.includes(busca) || codigo.includes(busca);
  });
  const produtosEmDestaque = produtos.slice(0, 4);
  const quantidadeRetiradaNumero = Number(kgRetirado || 0);

  useEffect(() => {
    const pararDeOuvirProdutos = listarProdutos(setProdutos, (error) => {
      setErro(`Erro ao carregar produtos: ${error.message}`);
    });

    return () => pararDeOuvirProdutos();
  }, []);

  useEffect(() => {
    const pararDeOuvirLinks = listarLinksAcesso(setLinksAcesso, (error) => {
      setErroLink(`Erro ao carregar links: ${error.message}`);
    });

    return () => pararDeOuvirLinks();
  }, []);

  useEffect(() => {
    const pararDeOuvirHistorico = listarMovimentacoes(
      setMovimentacoes,
      (error) => {
        setErroHistorico(`Erro ao carregar historico: ${error.message}`);
      },
    );

    return () => pararDeOuvirHistorico();
  }, []);

  useEffect(() => {
    async function validarAcessoCliente() {
      if (!tokenAcesso) {
        setAcessoCliente({
          carregando: false,
          link: null,
          erro: "",
        });
        return;
      }

      try {
        const link = await buscarLinkAcesso(tokenAcesso);

        if (!link) {
          setAcessoCliente({
            carregando: false,
            link: null,
            erro: "Link de acesso nao encontrado.",
          });
          return;
        }

        if (Date.now() > link.expiraEm) {
          setAcessoCliente({
            carregando: false,
            link: null,
            erro: "Este link de acesso expirou.",
          });
          return;
        }

        setAcessoCliente({
          carregando: false,
          link,
          erro: "",
        });
      } catch (error) {
        setAcessoCliente({
          carregando: false,
          link: null,
          erro: error.message,
        });
      }
    }

    validarAcessoCliente();
  }, [tokenAcesso]);

  function atualizarCampo(event) {
    const { name, value } = event.target;

    setFormulario({
      ...formulario,
      [name]: value,
    });
  }

  function formularioEstaValido() {
    return (
      formulario.nome.trim() &&
      formulario.fornecedor.trim() &&
      formulario.codigo.trim() &&
      formulario.descricao.trim() &&
      formulario.quantidadeKg
    );
  }

  async function salvarProduto(event) {
    event.preventDefault();
    setErro("");

    if (!formularioEstaValido()) {
      setErro("Preencha todos os campos antes de salvar.");
      return;
    }

    const produto = {
      nome: formulario.nome.trim(),
      fornecedor: formulario.fornecedor.trim(),
      codigo: formulario.codigo.trim(),
      descricao: formulario.descricao.trim(),
      quantidadeKg: Number(formulario.quantidadeKg),
    };

    try {
      if (produtoEditandoId) {
        await atualizarProduto(produtoEditandoId, produto);
        await cadastrarMovimentacao({
          tipo: "edicao",
          titulo: "Produto editado",
          produto,
          descricao: `${produto.nome} foi atualizado no cadastro.`,
        });
        setProdutoEditandoId(null);
      } else {
        await cadastrarProduto(produto);
        await cadastrarMovimentacao({
          tipo: "cadastro",
          titulo: "Produto cadastrado",
          produto,
          descricao: `${produto.nome} foi cadastrado com ${produto.quantidadeKg} kg.`,
        });
      }

      setFormulario(formularioInicial);
    } catch (error) {
      setErro(error.message);
    }
  }

  function editarProduto(produto) {
    setProdutoEditandoId(produto.id);
    setFormulario({
      nome: produto.nome,
      fornecedor: produto.fornecedor,
      codigo: produto.codigo,
      descricao: produto.descricao,
      quantidadeKg: produto.quantidadeKg ?? "",
    });
    setErro("");
  }

  async function removerProduto(id) {
    const produtoRemovido = produtos.find((produto) => produto.id === id);

    try {
      await excluirProduto(id);
      await cadastrarMovimentacao({
        tipo: "exclusao",
        titulo: "Produto excluido",
        produto: produtoRemovido || { id },
        descricao: produtoRemovido
          ? `${produtoRemovido.nome} foi excluido do cadastro.`
          : "Um produto foi excluido do cadastro.",
      });
    } catch (error) {
      setErro(error.message);
      return;
    }

    if (produtoEditandoId === id) {
      setProdutoEditandoId(null);
      setFormulario(formularioInicial);
    }
  }

  function cancelarEdicao() {
    setProdutoEditandoId(null);
    setFormulario(formularioInicial);
    setErro("");
  }

  function alternarTema() {
    setModoEscuro(!modoEscuro);
  }

  function abrirDashboardAcesso() {
    setErroLink("");
    setLinkCriado("");
    setModalAcessoAberto(true);
  }

  function abrirHistorico() {
    setErroHistorico("");
    setModalHistoricoAberto(true);
  }

  function abrirTodosProdutos() {
    setModalTodosProdutosAberto(true);
  }

  function fecharTodosProdutos() {
    setModalTodosProdutosAberto(false);
  }

  function fecharHistorico() {
    setErroHistorico("");
    setModalHistoricoAberto(false);
  }

  function fecharDashboardAcesso() {
    setErroLink("");
    setLinkCriado("");
    setModalAcessoAberto(false);
  }

  function abrirUsoProduto() {
    setModalUsoAberto(true);
    setProdutoEmUso(null);
    setEtapaUso(1);
    setTipoDeUso("");
    setBuscaProdutoUso("");
    setKgRetirado("");
    setErroUso("");
    setUsoConfirmado(false);
  }

  function abrirFichaEstoque() {
    setBuscaFichaEstoque("");
    setDevolucoesFicha({});
    setErroFicha("");
    setModalFichaAberto(true);
  }

  function fecharFichaEstoque() {
    setBuscaFichaEstoque("");
    setDevolucoesFicha({});
    setErroFicha("");
    setModalFichaAberto(false);
  }

  function atualizarDevolucaoFicha(id, valor) {
    setDevolucoesFicha({
      ...devolucoesFicha,
      [id]: valor,
    });
  }

  async function devolverKgProduto(produto) {
    const quantidadeDevolvida = Number(devolucoesFicha[produto.id] || 0);

    setErroFicha("");

    if (quantidadeDevolvida <= 0) {
      setErroFicha("Informe uma quantidade em kg maior que zero para devolver.");
      return;
    }

    try {
      await atualizarProduto(produto.id, {
        quantidadeKg: Number(produto.quantidadeKg || 0) + quantidadeDevolvida,
      });
      await cadastrarMovimentacao({
        tipo: "devolucao",
        titulo: "Kg devolvido ao estoque",
        produto,
        quantidadeKg: quantidadeDevolvida,
        descricao: `${quantidadeDevolvida} kg foram devolvidos para ${produto.nome}.`,
      });

      setDevolucoesFicha({
        ...devolucoesFicha,
        [produto.id]: "",
      });
    } catch (error) {
      setErroFicha(error.message);
    }
  }

  function atualizarCampoLink(event) {
    const { name, value } = event.target;

    setFormularioLink({
      ...formularioLink,
      [name]: value,
    });
  }

  async function criarLinkAcesso(event) {
    event.preventDefault();
    setErroLink("");
    setLinkCriado("");

    if (!formularioLink.nome.trim() || Number(formularioLink.valorTempo) <= 0) {
      setErroLink("Informe o nome do link e um tempo valido.");
      return;
    }

    const token = gerarTokenAcesso();
    const criadoEm = Date.now();
    const expiraEm =
      criadoEm +
      calcularDuracaoEmMs(formularioLink.valorTempo, formularioLink.unidadeTempo);

    try {
      await cadastrarLinkAcesso({
        token,
        nome: formularioLink.nome.trim(),
        criadoEm,
        expiraEm,
      });

      setFormularioLink(formularioLinkInicial);
      setLinkCriado(`${window.location.origin}?acesso=${token}`);
    } catch (error) {
      setErroLink(error.message);
    }
  }

  async function removerLinkAcesso(token) {
    try {
      await excluirLinkAcesso(token);
    } catch (error) {
      setErroLink(error.message);
    }
  }

  function fecharUsoProduto() {
    setModalUsoAberto(false);
    setProdutoEmUso(null);
    setEtapaUso(1);
    setTipoDeUso("");
    setBuscaProdutoUso("");
    setKgRetirado("");
    setErroUso("");
    setUsoConfirmado(false);
  }

  function avancarEtapaUso() {
    setErroUso("");

    if (etapaUso === 1 && !produtoEmUso) {
      setErroUso("Escolha um produto para continuar.");
      return;
    }

    if (etapaUso === 2 && !tipoDeUso) {
      setErroUso("Escolha onde o produto sera usado.");
      return;
    }

    if (etapaUso === 2 && Number(kgRetirado) <= 0) {
      setErroUso("Informe uma quantidade em kg maior que zero.");
      return;
    }

    if (
      etapaUso === 2 &&
      Number(kgRetirado) > Number(produtoEmUso.quantidadeKg || 0)
    ) {
      setErroUso("A quantidade retirada nao pode ser maior que o estoque.");
      return;
    }

    setEtapaUso(etapaUso + 1);
  }

  async function confirmarUsoProduto() {
    if (!produtoEmUso) {
      setErroUso("Escolha um produto antes de confirmar.");
      return;
    }

    const estoqueAtual = Number(produtoEmUso.quantidadeKg || 0);
    const novoEstoque = estoqueAtual - quantidadeRetiradaNumero;

    try {
      await atualizarProduto(produtoEmUso.id, {
        quantidadeKg: novoEstoque,
      });
      await cadastrarMovimentacao({
        tipo: "retirada",
        titulo: "Produto usado",
        produto: produtoEmUso,
        quantidadeKg: quantidadeRetiradaNumero,
        finalidade: tipoDeUso,
        descricao: `${quantidadeRetiradaNumero} kg de ${produtoEmUso.nome} foram retirados para ${tipoDeUso}.`,
      });
    } catch (error) {
      setErroUso(error.message);
      return;
    }

    setUsoConfirmado(true);

    setTimeout(() => {
      fecharUsoProduto();
    }, 1800);
  }

  if (tokenAcesso) {
    return (
      <div className={modoEscuro ? "app dark-mode" : "app"}>
        <header className="header">
          <div>
            <h1>Acesso de cliente</h1>
            <p>Consulta temporaria de produtos</p>
          </div>

          <button
            type="button"
            className="theme-toggle"
            onClick={alternarTema}
            aria-label={modoEscuro ? "Ativar modo claro" : "Ativar modo escuro"}
            title={modoEscuro ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {modoEscuro ? <Sun size={22} /> : <Moon size={22} />}
          </button>
        </header>

        <main className="content">
          {acessoCliente.carregando ? (
            <section className="products-container">
              <div className="empty-state">
                <h2>Validando acesso...</h2>
                <p>Aguarde um instante.</p>
              </div>
            </section>
          ) : acessoCliente.erro ? (
            <section className="products-container">
              <div className="empty-state">
                <h2>Acesso indisponivel</h2>
                <p>{acessoCliente.erro}</p>
              </div>
            </section>
          ) : (
            <section className="products-container">
              <div className="products-header">
                <div>
                  <h2>Produtos disponiveis</h2>
                  <span>Link: {acessoCliente.link.nome}</span>
                </div>
              </div>

              <div className="products-list">
                {produtos.map((produto) => (
                  <article className="product-card" key={produto.id}>
                    <div>
                      <h3>{produto.nome}</h3>
                      <p>{produto.descricao}</p>
                    </div>

                    <div className="product-info">
                      <span>Codigo: {produto.codigo}</span>
                      <span>Estoque: {produto.quantidadeKg ?? 0} kg</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className={modoEscuro ? "app dark-mode" : "app"}>
      <header className="header">
        <div>
          <h1>Produtos</h1>
          <p>Gerenciamento de produtos</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="icon-action"
            onClick={abrirDashboardAcesso}
            aria-label="Abrir dashboard de acesso"
            title="Abrir dashboard de acesso"
          >
            <Plus size={24} />
          </button>

          <button
            type="button"
            className="icon-action"
            onClick={abrirHistorico}
            aria-label="Abrir historico"
            title="Abrir historico"
          >
            <History size={23} />
          </button>

          <button
            type="button"
            className="theme-toggle"
            onClick={alternarTema}
            aria-label={modoEscuro ? "Ativar modo claro" : "Ativar modo escuro"}
            title={modoEscuro ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {modoEscuro ? <Sun size={22} /> : <Moon size={22} />}
          </button>
        </div>
      </header>

      <main className="content">
        {!firebaseConfigurado && (
          <div className="firebase-warning">
            Configure suas credenciais em src/firebaseconfig.js para ativar o
            CRUD com Firebase.
          </div>
        )}

        <section className="form-container">
          <h2>{produtoEditandoId ? "Editar produto" : "Cadastrar produto"}</h2>

          <form className="product-form" onSubmit={salvarProduto}>
            <div className="form-row">
              <label>
                Nome
                <input
                  type="text"
                  name="nome"
                  maxLength="45"
                  placeholder="Ex: Polímero A"
                  value={formulario.nome}
                  onChange={atualizarCampo}
                />
              </label>

              <label>
                Fornecedor
                <input
                  type="text"
                  name="fornecedor"
                  maxLength="40"
                  placeholder="Ex: SENAI"
                  value={formulario.fornecedor}
                  onChange={atualizarCampo}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Codigo
                <input
                  type="text"
                  name="codigo"
                  maxLength="24"
                  placeholder="Ex: PROD-001"
                  value={formulario.codigo}
                  onChange={atualizarCampo}
                />
              </label>

              <label>
                Quantidade (kg)
                <input
                  type="number"
                  name="quantidadeKg"
                  placeholder="Ex: 50"
                  min="0"
                  max="99999"
                  step="0.01"
                  value={formulario.quantidadeKg}
                  onChange={atualizarCampo}
                />
              </label>
            </div>

            <div className="form-row single-column">
              <label>
                Descricao
                <textarea
                  name="descricao"
                  maxLength="140"
                  placeholder="Ex: Produto novo em estoque"
                  value={formulario.descricao}
                  onChange={atualizarCampo}
                />
              </label>
            </div>

            {erro && <p className="form-error">{erro}</p>}

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {produtoEditandoId ? "Atualizar produto" : "Salvar produto"}
              </button>

              {produtoEditandoId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={cancelarEdicao}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="products-container">
          <div className="products-header">
            <div>
              <h2>Produtos cadastrados</h2>
              <span>{produtos.length} produto(s)</span>
            </div>

            <div className="products-header-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={abrirUsoProduto}
                disabled={produtos.length === 0}
              >
                Usar produto
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={abrirFichaEstoque}
                disabled={produtos.length === 0}
              >
                Ficha de estoque
              </button>
            </div>
          </div>

          {produtos.length === 0 ? (
            <div className="empty-state">
              <h2>Nenhum produto cadastrado</h2>

              <p>Comece adicionando um novo produto ao sistema.</p>
            </div>
          ) : (
            <div className="products-list">
              {produtosEmDestaque.map((produto) => (
                <article
                  className="product-card"
                  key={produto.id}
                >
                  <div>
                    <h3>{produto.nome}</h3>
                    <p>{produto.descricao}</p>
                  </div>

                  <div className="product-info">
                    <span>
                      <small>Fornecedor</small>
                      {produto.fornecedor}
                    </span>
                    <span>
                      <small>Codigo</small>
                      {produto.codigo}
                    </span>
                    <span className="stock-value">
                      <small>Estoque</small>
                      {produto.quantidadeKg ?? 0} kg
                    </span>
                  </div>

                  <div className="product-actions">
                    <button
                      type="button"
                      className="icon-button edit"
                      onClick={() => editarProduto(produto)}
                      aria-label={`Editar ${produto.nome}`}
                      title="Editar"
                    >
                      <Pencil size={20} />
                    </button>

                    <button
                      type="button"
                      className="icon-button delete"
                      onClick={() => removerProduto(produto.id)}
                      aria-label={`Excluir ${produto.nome}`}
                      title="Excluir"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {produtos.length > 4 && (
            <div className="see-more-area">
              <button
                type="button"
                className="btn-secondary"
                onClick={abrirTodosProdutos}
              >
                Ver mais produtos
              </button>
            </div>
          )}
        </section>
      </main>

      {modalUsoAberto && (
        <div className="usage-overlay">
          <section className="usage-modal">
            {usoConfirmado ? (
              <div className="success-state">
                <div className="success-icon">
                  <Check size={42} />
                </div>

                <h2>Uso confirmado</h2>
                <p>
                  {quantidadeRetiradaNumero} kg de {produtoEmUso.nome} foram
                  retirados para {tipoDeUso}.
                </p>
              </div>
            ) : (
              <>
                <div className="usage-header">
                  <div>
                    <span>Etapa {etapaUso} de 3</span>
                    <h2>Usar produto</h2>
                  </div>

                  <button
                    type="button"
                    className="close-modal"
                    onClick={fecharUsoProduto}
                    aria-label="Fechar"
                  >
                    x
                  </button>
                </div>

                <div className="steps">
                  <span className={etapaUso >= 1 ? "step active" : "step"} />
                  <span className={etapaUso >= 2 ? "step active" : "step"} />
                  <span className={etapaUso >= 3 ? "step active" : "step"} />
                </div>

                {etapaUso === 1 && (
                  <div className="usage-step">
                    <h3>Qual produto voce quer usar?</h3>

                    <input
                      type="text"
                      className="usage-search"
                      placeholder="Pesquisar por nome ou codigo..."
                      value={buscaProdutoUso}
                      onChange={(event) => setBuscaProdutoUso(event.target.value)}
                    />

                    <div className="usage-products-list">
                      {produtosFiltradosParaUso.map((produto) => (
                        <button
                          type="button"
                          className={
                            produtoEmUso?.id === produto.id
                              ? "usage-product selected"
                              : "usage-product"
                          }
                          key={produto.id}
                          onClick={() => setProdutoEmUso(produto)}
                        >
                          <strong>{produto.nome}</strong>
                          <span>Codigo: {produto.codigo}</span>
                          <span>Estoque: {produto.quantidadeKg ?? 0} kg</span>
                        </button>
                      ))}
                    </div>

                    {produtosFiltradosParaUso.length === 0 && (
                      <p className="usage-empty">Nenhum produto encontrado.</p>
                    )}
                  </div>
                )}

                {etapaUso === 2 && (
                  <div className="usage-step">
                    <h3>Onde esse produto sera usado?</h3>

                    <div className="selected-product compact">
                      <strong>{produtoEmUso.nome}</strong>
                      <span>Estoque atual: {produtoEmUso.quantidadeKg ?? 0} kg</span>
                    </div>

                    <div className="usage-options">
                      {opcoesDeUso.map((opcao) => (
                        <label
                          className={
                            tipoDeUso === opcao
                              ? "usage-option selected"
                              : "usage-option"
                          }
                          key={opcao}
                        >
                          <input
                            type="radio"
                            name="tipoDeUso"
                            value={opcao}
                            checked={tipoDeUso === opcao}
                            onChange={(event) => setTipoDeUso(event.target.value)}
                          />
                          {opcao}
                        </label>
                      ))}
                    </div>

                    <label className="kg-field">
                      Quantos kg serao retirados?
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ex: 13"
                        value={kgRetirado}
                        onChange={(event) => setKgRetirado(event.target.value)}
                      />
                    </label>

                  </div>
                )}

                {etapaUso === 3 && (
                  <div className="usage-step">
                    <h3>Revise suas informacoes</h3>

                    <div className="review-card">
                      <p>
                        <strong>Produto:</strong> {produtoEmUso.nome}
                      </p>
                      <p>
                        <strong>Codigo:</strong> {produtoEmUso.codigo}
                      </p>
                      <p>
                        <strong>Fornecedor:</strong> {produtoEmUso.fornecedor}
                      </p>
                      <p>
                        <strong>Uso:</strong> {tipoDeUso}
                      </p>
                      <p>
                        <strong>Retirada:</strong> {kgRetirado} kg
                      </p>
                    </div>

                    <div className="review-card calculation-card">
                      <p>
                        <strong>Retirada confirmada:</strong>{" "}
                        {quantidadeRetiradaNumero} kg
                      </p>
                      <p>
                        <strong>Estoque apos uso:</strong>{" "}
                        {Number(produtoEmUso.quantidadeKg || 0) -
                          quantidadeRetiradaNumero}{" "}
                        kg
                      </p>
                    </div>
                  </div>
                )}

                {erroUso && <p className="form-error">{erroUso}</p>}

                <div className="usage-actions">
                  {etapaUso > 1 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setEtapaUso(etapaUso - 1)}
                    >
                      Voltar
                    </button>
                  )}

                  {etapaUso < 3 ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={avancarEtapaUso}
                      disabled={etapaUso === 2 && !tipoDeUso}
                    >
                      Continuar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={confirmarUsoProduto}
                    >
                      Confirmar
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {modalAcessoAberto && (
        <div className="usage-overlay">
          <section className="usage-modal access-modal">
            <div className="usage-header">
              <div>
                <span>{linksAcesso.length} link(s) criado(s)</span>
                <h2>Dashboard de acesso</h2>
              </div>

              <button
                type="button"
                className="close-modal"
                onClick={fecharDashboardAcesso}
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <form className="access-form" onSubmit={criarLinkAcesso}>
              <label>
                Nome do link
                <input
                  type="text"
                  name="nome"
                  maxLength="40"
                  value={formularioLink.nome}
                  onChange={atualizarCampoLink}
                />
              </label>

              <label>
                Tempo ativo
                <input
                  type="number"
                  name="valorTempo"
                  min="1"
                  value={formularioLink.valorTempo}
                  onChange={atualizarCampoLink}
                />
              </label>

              <label>
                Unidade
                <select
                  name="unidadeTempo"
                  value={formularioLink.unidadeTempo}
                  onChange={atualizarCampoLink}
                >
                  <option value="segundos">Segundos</option>
                  <option value="minutos">Minutos</option>
                  <option value="horas">Horas</option>
                </select>
              </label>

              <button type="submit" className="btn-primary">
                Criar link
              </button>
            </form>

            {erroLink && <p className="form-error">{erroLink}</p>}

            {linkCriado && (
              <div className="created-link">
                <strong>Link criado:</strong>
                <a href={linkCriado} target="_blank" rel="noreferrer">
                  {linkCriado}
                </a>
              </div>
            )}

            <div className="access-links">
              {linksAcesso.map((link) => {
                const expirado = Date.now() > link.expiraEm;

                return (
                  <article className="access-link-card" key={link.id}>
                    <div>
                      <strong>{link.nome}</strong>
                      <span>{expirado ? "Expirado" : "Ativo"}</span>
                      <p>Expira em: {formatarData(link.expiraEm)}</p>
                    </div>

                    <div className="access-link-actions">
                      <a
                        className="btn-secondary"
                        href={`${window.location.origin}?acesso=${link.token}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir
                      </a>

                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => removerLinkAcesso(link.token)}
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {modalHistoricoAberto && (
        <div className="usage-overlay">
          <section className="usage-modal history-modal">
            <div className="usage-header">
              <div>
                <span>{movimentacoes.length} registro(s)</span>
                <h2>Historico de movimentacoes</h2>
              </div>

              <button
                type="button"
                className="close-modal"
                onClick={fecharHistorico}
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            {erroHistorico && <p className="form-error">{erroHistorico}</p>}

            <div className="history-list">
              {movimentacoes.map((movimentacao) => (
                <article
                  className={`history-item ${movimentacao.tipo}`}
                  key={movimentacao.id}
                >
                  <div>
                    <strong>{movimentacao.titulo}</strong>
                    <span>{formatarData(movimentacao.criadoEm)}</span>
                  </div>

                  <p>{movimentacao.descricao}</p>

                  {movimentacao.produto && (
                    <div className="history-details">
                      <span>Produto: {movimentacao.produto.nome || "Nao informado"}</span>
                      <span>Codigo: {movimentacao.produto.codigo || "Nao informado"}</span>
                      {movimentacao.quantidadeKg && (
                        <span>Quantidade: {movimentacao.quantidadeKg} kg</span>
                      )}
                      {movimentacao.finalidade && (
                        <span>Finalidade: {movimentacao.finalidade}</span>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>

            {movimentacoes.length === 0 && (
              <p className="usage-empty">Nenhuma movimentacao registrada.</p>
            )}
          </section>
        </div>
      )}

      {modalTodosProdutosAberto && (
        <div className="usage-overlay">
          <section className="usage-modal all-products-modal">
            <div className="usage-header">
              <div>
                <span>{produtos.length} produto(s)</span>
                <h2>Todos os produtos</h2>
              </div>

              <button
                type="button"
                className="close-modal"
                onClick={fecharTodosProdutos}
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <div className="products-list modal-products-list">
              {produtos.map((produto) => (
                <article className="product-card" key={produto.id}>
                  <div>
                    <h3>{produto.nome}</h3>
                    <p>{produto.descricao}</p>
                  </div>

                  <div className="product-info">
                    <span>
                      <small>Fornecedor</small>
                      {produto.fornecedor}
                    </span>
                    <span>
                      <small>Codigo</small>
                      {produto.codigo}
                    </span>
                    <span className="stock-value">
                      <small>Estoque</small>
                      {produto.quantidadeKg ?? 0} kg
                    </span>
                  </div>

                  <div className="product-actions">
                    <button
                      type="button"
                      className="icon-button edit"
                      onClick={() => editarProduto(produto)}
                      aria-label={`Editar ${produto.nome}`}
                      title="Editar"
                    >
                      <Pencil size={20} />
                    </button>

                    <button
                      type="button"
                      className="icon-button delete"
                      onClick={() => removerProduto(produto.id)}
                      aria-label={`Excluir ${produto.nome}`}
                      title="Excluir"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {modalFichaAberto && (
        <div className="usage-overlay">
          <section className="usage-modal">
            <div className="usage-header">
              <div>
                <span>Resumo geral</span>
                <h2>Ficha de estoque</h2>
              </div>

              <button
                type="button"
                className="close-modal"
                onClick={fecharFichaEstoque}
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <input
              type="text"
              className="usage-search"
              placeholder="Filtrar por nome ou codigo..."
              value={buscaFichaEstoque}
              onChange={(event) => setBuscaFichaEstoque(event.target.value)}
            />

            {erroFicha && <p className="form-error">{erroFicha}</p>}

            <div className="stock-sheet">
              {produtosFiltradosFicha.map((produto) => {
                const statusEstoque = obterStatusEstoque(produto.quantidadeKg);

                return (
                  <article className="stock-sheet-item" key={produto.id}>
                    <div>
                      <strong>{produto.nome}</strong>
                      <span>Codigo: {produto.codigo}</span>
                    </div>

                    <div>
                      <strong>{produto.quantidadeKg ?? 0} kg</strong>
                      <span className={`stock-pill ${statusEstoque.classe}`}>
                        {statusEstoque.texto}
                      </span>
                    </div>

                    <p>{statusEstoque.descricao}</p>

                    <div className="stock-return">
                      <label>
                        Devolver kg para {produto.nome}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Ex: 4"
                          value={devolucoesFicha[produto.id] || ""}
                          onChange={(event) =>
                            atualizarDevolucaoFicha(produto.id, event.target.value)
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => devolverKgProduto(produto)}
                      >
                        Devolver neste item
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {produtosFiltradosFicha.length === 0 && (
              <p className="usage-empty">Nenhum produto encontrado.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
