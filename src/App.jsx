import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUp,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Container,
  Filter,
  FlaskConical,
  GraduationCap,
  History,
  LayoutDashboard,
  Moon,
  PackagePlus,
  PackageSearch,
  Pencil,
  RulerDimensionLine,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import "./App.css";
import {
  atualizarProduto,
  buscarLinkAcesso,
  cadastrarMovimentacao,
  cadastrarLinkAcesso,
  cadastrarProduto,
  cadastrarProdutoFinal,
  excluirProduto,
  excluirLinkAcesso,
  excluirProdutoFinal,
  listarLinksAcesso,
  listarMovimentacoes,
  listarProdutos,
  listarProdutosFinais,
} from "./crud";
import { firebaseConfigurado } from "./firebaseconfig";
import senaiLogo from "./assets/senai-logo.png";

const formularioInicial = {
  nome: "",
  fornecedor: "",
  codigo: "",
  descricao: "",
  quantidadeKg: "",
  unidadeMedida: "kg",
  tipoEstoque: "principal",
  limiteBaixo: "5",
  limiteAtencao: "30",
};

const opcoesMovimentacaoPrincipal = [
  {
    valor: "abastecer-pequeno",
    titulo: "Enviar para Estoque Pequeno",
    descricao: "Caminho recomendado: o pavilhao abastece os baldes de aula.",
  },
  {
    valor: "retirada-emergencial",
    titulo: "Retirada emergencial do Principal",
    descricao: "Use apenas quando nao der tempo de passar pelo Estoque Pequeno.",
  },
];
const opcoesJustificativaUso = [
  {
    valor: "sucata",
    titulo: "Sucata",
    descricao: "Material vai para sucata/moagem.",
    destino: "Sucata/Moinho",
    icone: Container,
  },
  {
    valor: "produto",
    titulo: "Produto",
    descricao: "Material virou produto final.",
    destino: "Produto final",
    icone: PackagePlus,
  },
  {
    valor: "estoque",
    titulo: "Estoque",
    descricao: "Material volta para um estoque.",
    destino: "Estoque",
    icone: Warehouse,
  },
  {
    valor: "perda",
    titulo: "Perda",
    descricao: "Material perdido no processo.",
    destino: "Perda",
    icone: AlertTriangle,
  },
];
const unidadePadrao = "kg";
const estoquePrincipal = "principal";
const estoquePequeno = "pequeno";
const itensPorPaginaProdutos = 6;
const configuracoesEstoquePadrao = {
  limiteBaixo: 5,
  limiteAtencao: 30,
};
const perfilAdmin = "admin";
const perfilAluno = "aluno";
const formularioLinkInicial = {
  nome: "",
  valorTempo: "",
  unidadeTempo: "minutos",
};
const produtoFinalInicial = {
  nome: "",
  foto: "",
};
const registroUsoInicial = {
  produtoId: "",
  aluno: "",
  quantidadeRetirada: "",
  produto: "",
  sucata: "",
  estoque: "",
  perda: "",
  produtoFinalId: "",
  destinoEstoque: estoquePequeno,
  justificativa: "",
};

function obterStatusEstoque(quantidadeKg, configuracoes = configuracoesEstoquePadrao) {
  const quantidade = Number(quantidadeKg || 0);
  const limiteBaixo = Number(configuracoes.limiteBaixo || 0);
  const limiteAtencao = Math.max(
    limiteBaixo,
    Number(configuracoes.limiteAtencao || 0),
  );

  if (quantidade <= limiteBaixo) {
    return {
      classe: "low",
      texto: "Repor estoque",
      descricao: "Estoque baixo. Reposite assim que possivel.",
    };
  }

  if (quantidade <= limiteAtencao) {
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

function obterUnidadeProduto(produto) {
  return produto.unidadeMedida || unidadePadrao;
}

function obterTipoEstoqueProduto(produto) {
  return produto.tipoEstoque || estoquePrincipal;
}

function obterConfiguracoesEstoqueProduto(produto) {
  return {
    limiteBaixo:
      produto.limiteBaixo ?? configuracoesEstoquePadrao.limiteBaixo,
    limiteAtencao:
      produto.limiteAtencao ?? configuracoesEstoquePadrao.limiteAtencao,
  };
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toLowerCase();
}

function calcularTotaisPorUnidade(listaProdutos) {
  return listaProdutos.reduce(
    (totais, produto) => {
      const quantidade = Number(produto.quantidadeKg || 0);
      const unidade = obterUnidadeProduto(produto).toLowerCase();

      if (unidade === "g") {
        return {
          ...totais,
          gramas: Number((totais.gramas + quantidade).toFixed(2)),
          totalVisual: Number((totais.totalVisual + quantidade / 1000).toFixed(2)),
        };
      }

      if (unidade === "kg") {
        return {
          ...totais,
          kg: Number((totais.kg + quantidade).toFixed(2)),
          totalVisual: Number((totais.totalVisual + quantidade).toFixed(2)),
        };
      }

      return totais;
    },
    { kg: 0, gramas: 0, totalVisual: 0 },
  );
}

function calcularPorcentagemGrafico(valor, maiorValor) {
  if (maiorValor <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((valor / maiorValor) * 100));
}

function App() {
  const [formulario, setFormulario] = useState(formularioInicial);
  const [produtos, setProdutos] = useState([]);
  const [produtoEditandoId, setProdutoEditandoId] = useState(null);
  const [erro, setErro] = useState("");
  const [modoEscuro, setModoEscuro] = useState(() => {
    return localStorage.getItem("storage-tema") === "escuro";
  });
  const [introJaVista, setIntroJaVista] = useState(false);
  const [mostrarTelaInicial, setMostrarTelaInicial] = useState(false);
  const [menuLateralAberto, setMenuLateralAberto] = useState(true);
  const [perfilSistema, setPerfilSistema] = useState(perfilAdmin);
  const [produtosFinais, setProdutosFinais] = useState([]);
  const [formProdutoFinal, setFormProdutoFinal] = useState(produtoFinalInicial);
  const [modalRegistroUsoAberto, setModalRegistroUsoAberto] = useState(false);
  const [registroUso, setRegistroUso] = useState(registroUsoInicial);
  const [erroRegistroUso, setErroRegistroUso] = useState("");
  const [modalUsoAberto, setModalUsoAberto] = useState(false);
  const [modalFichaAberto, setModalFichaAberto] = useState(false);
  const [modalEstoquePequenoAberto, setModalEstoquePequenoAberto] = useState(false);
  const [modalAcessoAberto, setModalAcessoAberto] = useState(false);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [modalTodosProdutosAberto, setModalTodosProdutosAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("painel");
  const [produtoEmUso, setProdutoEmUso] = useState(null);
  const [etapaUso, setEtapaUso] = useState(1);
  const [tipoDeUso, setTipoDeUso] = useState("");
  const [usoConfirmado, setUsoConfirmado] = useState(false);
  const [buscaProdutoUso, setBuscaProdutoUso] = useState("");
  const [buscaFichaEstoque, setBuscaFichaEstoque] = useState("");
  const [buscaEstoquePequeno, setBuscaEstoquePequeno] = useState("");
  const [buscaRegistroUso, setBuscaRegistroUso] = useState("");
  const [buscaTodosProdutos, setBuscaTodosProdutos] = useState("");
  const [paginaTodosProdutos, setPaginaTodosProdutos] = useState(1);
  const [kgRetirado, setKgRetirado] = useState("");
  const [devolucoesFicha, setDevolucoesFicha] = useState({});
  const [usosEstoquePequeno, setUsosEstoquePequeno] = useState({});
  const [justificativasUsoEstoquePequeno, setJustificativasUsoEstoquePequeno] =
    useState({});
  const [devolucoesEstoquePequeno, setDevolucoesEstoquePequeno] = useState({});
  const [destinosDevolucaoEstoquePequeno, setDestinosDevolucaoEstoquePequeno] =
    useState({});
  const [erroUso, setErroUso] = useState("");
  const [erroFicha, setErroFicha] = useState("");
  const [erroEstoquePequeno, setErroEstoquePequeno] = useState("");
  const [erroProdutoFinal, setErroProdutoFinal] = useState("");
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
  const usuarioAdmin = perfilSistema === perfilAdmin;

  const produtosPrincipal = produtos.filter(
    (produto) => obterTipoEstoqueProduto(produto) === estoquePrincipal,
  );
  const produtosPequeno = produtos.filter(
    (produto) => obterTipoEstoqueProduto(produto) === estoquePequeno,
  );
  const produtosFiltradosParaUso = produtosPrincipal.filter((produto) => {
    const busca = buscaProdutoUso.toLowerCase().trim();
    const nome = String(produto.nome || "").toLowerCase();
    const codigo = String(produto.codigo || "").toLowerCase();

    return nome.includes(busca) || codigo.includes(busca);
  });
  const produtosFiltradosFicha = produtosPrincipal.filter((produto) => {
    const busca = buscaFichaEstoque.toLowerCase().trim();
    const nome = String(produto.nome || "").toLowerCase();
    const codigo = String(produto.codigo || "").toLowerCase();

    return nome.includes(busca) || codigo.includes(busca);
  });
  const produtosFiltradosEstoquePequeno = produtosPequeno.filter((produto) => {
    const busca = buscaEstoquePequeno.toLowerCase().trim();
    const nome = String(produto.nome || "").toLowerCase();
    const codigo = String(produto.codigo || "").toLowerCase();

    return nome.includes(busca) || codigo.includes(busca);
  });
  const produtosFiltradosRegistroUso = produtosPequeno.filter((produto) => {
    const busca = buscaRegistroUso.toLowerCase().trim();
    const nome = String(produto.nome || "").toLowerCase();
    const codigo = String(produto.codigo || "").toLowerCase();

    return nome.includes(busca) || codigo.includes(busca);
  });
  const produtoRegistroUso = produtosPequeno.find(
    (produto) => produto.id === registroUso.produtoId,
  );
  const quantidadeRegistroRetirada = Number(registroUso.quantidadeRetirada || 0);
  const totalRegistroJustificado =
    Number(registroUso.produto || 0) +
    Number(registroUso.sucata || 0) +
    Number(registroUso.estoque || 0) +
    Number(registroUso.perda || 0);
  const diferencaRegistroUso = Number(
    (quantidadeRegistroRetirada - totalRegistroJustificado).toFixed(2),
  );
  const registroUsoPrecisaJustificativa = Math.abs(diferencaRegistroUso) > 0.009;
  const produtoFinalSelecionado = produtosFinais.find(
    (produtoFinal) => produtoFinal.id === registroUso.produtoFinalId,
  );
  const produtosFiltradosTodos = produtos.filter((produto) => {
    const busca = buscaTodosProdutos.toLowerCase().trim();
    const nome = String(produto.nome || "").toLowerCase();
    const codigo = String(produto.codigo || "").toLowerCase();

    return nome.includes(busca) || codigo.includes(busca);
  });
  const totalPaginasTodosProdutos = Math.max(
    1,
    Math.ceil(produtosFiltradosTodos.length / itensPorPaginaProdutos),
  );
  const paginaAtualTodosProdutos = Math.min(
    paginaTodosProdutos,
    totalPaginasTodosProdutos,
  );
  const inicioPaginaTodosProdutos =
    (paginaAtualTodosProdutos - 1) * itensPorPaginaProdutos;
  const produtosPaginadosTodos = produtosFiltradosTodos.slice(
    inicioPaginaTodosProdutos,
    inicioPaginaTodosProdutos + itensPorPaginaProdutos,
  );
  const totaisEstoquePrincipal = calcularTotaisPorUnidade(produtosPrincipal);
  const totaisEstoquePequeno = calcularTotaisPorUnidade(produtosPequeno);
  const totaisMoinho = calcularTotaisPorUnidade([]);
  const maiorTotalGrafico = Math.max(
    totaisEstoquePrincipal.totalVisual,
    totaisEstoquePequeno.totalVisual,
    totaisMoinho.totalVisual,
    1,
  );
  const produtosEmDestaque = produtos.slice(0, 4);
  const quantidadeRetiradaNumero = Number(kgRetirado || 0);
  const movimentacaoPrincipalSelecionada = opcoesMovimentacaoPrincipal.find(
    (opcao) => opcao.valor === tipoDeUso,
  );

  function calcularSaldoParaDevolver(produto) {
    const totais = movimentacoes.reduce(
      (resultado, movimentacao) => {
        const mesmoProduto =
          movimentacao.produto?.id === produto.id ||
          normalizarCodigo(movimentacao.produto?.codigo) ===
            normalizarCodigo(produto.codigo);
        const quantidade = Number(movimentacao.quantidadeKg || 0);

        if (!mesmoProduto || quantidade <= 0) {
          return resultado;
        }

        if (
          (movimentacao.tipo === "retirada" ||
            movimentacao.tipo === "retirada_emergencial") &&
          (!movimentacao.origem || movimentacao.origem === "Estoque Principal")
        ) {
          return {
            ...resultado,
            retirado: resultado.retirado + quantidade,
          };
        }

        if (
          movimentacao.tipo === "devolucao" &&
          movimentacao.origem !== "Estoque Pequeno"
        ) {
          return {
            ...resultado,
            devolvido: resultado.devolvido + quantidade,
          };
        }

        return resultado;
      },
      {
        retirado: 0,
        devolvido: 0,
      },
    );

    return Math.max(0, Number((totais.retirado - totais.devolvido).toFixed(2)));
  }

  useEffect(() => {
    const pararDeOuvirProdutos = listarProdutos(setProdutos, (error) => {
      setErro(`Erro ao carregar produtos: ${error.message}`);
    });

    return () => pararDeOuvirProdutos();
  }, []);

  useEffect(() => {
    const pararDeOuvirProdutosFinais = listarProdutosFinais(
      setProdutosFinais,
      (error) => {
        setErroProdutoFinal(
          `Erro ao carregar produtos finais: ${error.message}`,
        );
      },
    );

    return () => pararDeOuvirProdutosFinais();
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
        setErroHistorico(`Erro ao carregar Historico: ${error.message}`);
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
      Number(formulario.quantidadeKg) > 0 &&
      Number(formulario.limiteBaixo) >= 0 &&
      Number(formulario.limiteAtencao) >= Number(formulario.limiteBaixo)
    );
  }

  async function salvarProduto(event) {
    event.preventDefault();
    setErro("");

    if (!usuarioAdmin) {
      setErro("Apenas professores/admins podem cadastrar ou atualizar produtos.");
      return;
    }

    if (!formularioEstaValido()) {
      setErro(
        "Preencha todos os campos e deixe o limite de atencao maior ou igual ao limite de reposicao.",
      );
      return;
    }

    const produto = {
      nome: formulario.nome.trim(),
      fornecedor: formulario.fornecedor.trim(),
      codigo: formulario.codigo.trim(),
      descricao: formulario.descricao.trim(),
      quantidadeKg: Number(formulario.quantidadeKg),
      unidadeMedida: formulario.unidadeMedida,
      tipoEstoque: formulario.tipoEstoque,
      limiteBaixo: Number(formulario.limiteBaixo),
      limiteAtencao: Number(formulario.limiteAtencao),
    };
    const destinoSelecionado =
      produto.tipoEstoque === estoquePequeno
        ? "Estoque Pequeno"
        : "Estoque Principal";

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
        const produtoJaCadastrado = produtos.find((produtoAtual) => {
          const mesmoCodigo =
            normalizarCodigo(produtoAtual.codigo) === normalizarCodigo(produto.codigo);
          const mesmoEstoque =
            obterTipoEstoqueProduto(produtoAtual) === produto.tipoEstoque;

          return mesmoCodigo && mesmoEstoque;
        });

        if (produtoJaCadastrado) {
          const quantidadeAtual = Number(produtoJaCadastrado.quantidadeKg || 0);
          const novaQuantidade = Number(
            (quantidadeAtual + produto.quantidadeKg).toFixed(2),
          );

          await atualizarProduto(produtoJaCadastrado.id, {
            ...produto,
            quantidadeKg: novaQuantidade,
          });

          await cadastrarMovimentacao({
            tipo: "entrada",
            titulo: "Quantidade adicionada ao estoque",
            produto: {
              id: produtoJaCadastrado.id,
              ...produto,
              quantidadeKg: novaQuantidade,
            },
            quantidadeKg: produto.quantidadeKg,
            origem: "Cadastro de produtos",
            destino: destinoSelecionado,
            descricao: `${produto.quantidadeKg} ${produto.unidadeMedida} foram adicionados ao estoque de ${produto.nome}. Total atual: ${novaQuantidade} ${produto.unidadeMedida}.`,
          });
        } else {
          await cadastrarProduto(produto);
          await cadastrarMovimentacao({
            tipo: "cadastro",
            titulo: "Produto cadastrado",
            produto,
            quantidadeKg: produto.quantidadeKg,
            origem: "Cadastro de produtos",
            destino: destinoSelecionado,
            descricao: `${produto.nome} foi cadastrado com ${produto.quantidadeKg} ${produto.unidadeMedida}.`,
          });
        }
      }

      setFormulario(formularioInicial);
      setModalEntradaAberto(false);
    } catch (error) {
      setErro(error.message);
    }
  }

  function editarProduto(produto) {
    if (!usuarioAdmin) {
      return;
    }

    setProdutoEditandoId(produto.id);
    setModalTodosProdutosAberto(false);
    setModalEntradaAberto(true);
    setFormulario({
      nome: produto.nome,
      fornecedor: produto.fornecedor,
      codigo: produto.codigo,
      descricao: produto.descricao,
      quantidadeKg: produto.quantidadeKg ?? "",
      unidadeMedida: obterUnidadeProduto(produto),
      tipoEstoque: obterTipoEstoqueProduto(produto),
      limiteBaixo:
        produto.limiteBaixo ?? configuracoesEstoquePadrao.limiteBaixo,
      limiteAtencao:
        produto.limiteAtencao ?? configuracoesEstoquePadrao.limiteAtencao,
    });
    setErro("");
  }

  async function removerProduto(id) {
    if (!usuarioAdmin) {
      setErro("Apenas professores/admins podem excluir produtos.");
      return;
    }

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
    const novoModoEscuro = !modoEscuro;

    setModoEscuro(novoModoEscuro);
    localStorage.setItem("storage-tema", novoModoEscuro ? "escuro" : "claro");
  }

  function rolarParaTopo() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function trocarAba(id) {
    if (!usuarioAdmin && id === "admin") {
      setAbaAtiva("painel");
      rolarParaTopo();
      return;
    }

    setAbaAtiva(id);
    rolarParaTopo();
  }

  function trocarPerfilSistema(novoPerfil) {
    setPerfilSistema(novoPerfil);

    if (novoPerfil === perfilAluno && abaAtiva === "admin") {
      setProdutoEditandoId(null);
      setFormulario(formularioInicial);
      setAbaAtiva("painel");
    }
  }

  function abrirHistorico() {
    setErroHistorico("");
    setAbaAtiva("movimentacoes");
  }

  function abrirTodosProdutos() {
    setBuscaTodosProdutos("");
    setPaginaTodosProdutos(1);
    setAbaAtiva("entrada");
    rolarParaTopo();
  }

  function fecharTodosProdutos() {
    setBuscaTodosProdutos("");
    setPaginaTodosProdutos(1);
    setModalTodosProdutosAberto(false);
  }

  function abrirEntradaProduto() {
    setErro("");
    setModalEntradaAberto(true);
  }

  function fecharEntradaProduto() {
    setErro("");
    setProdutoEditandoId(null);
    setFormulario(formularioInicial);
    setModalEntradaAberto(false);
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
    setAbaAtiva("principal");
  }

  function fecharFichaEstoque() {
    setBuscaFichaEstoque("");
    setDevolucoesFicha({});
    setErroFicha("");
    setModalFichaAberto(false);
  }

  function abrirEstoquePequeno() {
    setBuscaEstoquePequeno("");
    setUsosEstoquePequeno({});
    setJustificativasUsoEstoquePequeno({});
    setDevolucoesEstoquePequeno({});
    setDestinosDevolucaoEstoquePequeno({});
    setErroEstoquePequeno("");
    setAbaAtiva("pequeno");
  }

  function abrirRegistroUsoAula() {
    setRegistroUso(registroUsoInicial);
    setBuscaRegistroUso("");
    setErroRegistroUso("");
    setModalRegistroUsoAberto(true);
  }

  function fecharRegistroUsoAula() {
    setRegistroUso(registroUsoInicial);
    setBuscaRegistroUso("");
    setErroRegistroUso("");
    setModalRegistroUsoAberto(false);
  }

  function fecharEstoquePequeno() {
    setBuscaEstoquePequeno("");
    setUsosEstoquePequeno({});
    setJustificativasUsoEstoquePequeno({});
    setDevolucoesEstoquePequeno({});
    setDestinosDevolucaoEstoquePequeno({});
    setErroEstoquePequeno("");
    setModalEstoquePequenoAberto(false);
  }

  function atualizarDevolucaoFicha(id, valor) {
    setDevolucoesFicha({
      ...devolucoesFicha,
      [id]: valor,
    });
  }

  function atualizarUsoEstoquePequeno(id, valor) {
    setUsosEstoquePequeno({
      ...usosEstoquePequeno,
      [id]: valor,
    });
  }

  function atualizarCampoRegistroUso(event) {
    const { name, value } = event.target;

    setRegistroUso({
      ...registroUso,
      [name]: value,
    });
  }

  function atualizarCampoProdutoFinal(event) {
    const { name, value } = event.target;

    setFormProdutoFinal({
      ...formProdutoFinal,
      [name]: value,
    });
  }

  function atualizarFotoProdutoFinal(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) {
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      setFormProdutoFinal({
        ...formProdutoFinal,
        foto: leitor.result,
      });
    };

    leitor.readAsDataURL(arquivo);
  }

  function atualizarDevolucaoEstoquePequeno(id, valor) {
    setDevolucoesEstoquePequeno({
      ...devolucoesEstoquePequeno,
      [id]: valor,
    });
  }

  function atualizarDestinoDevolucaoEstoquePequeno(id, valor) {
    setDestinosDevolucaoEstoquePequeno({
      ...destinosDevolucaoEstoquePequeno,
      [id]: valor,
    });
  }

  async function salvarProdutoFinal(event) {
    event.preventDefault();
    setErroProdutoFinal("");

    if (!formProdutoFinal.nome.trim()) {
      setErroProdutoFinal("Informe o nome do produto final.");
      return;
    }

    const novoProdutoFinal = {
      id: crypto.randomUUID(),
      nome: formProdutoFinal.nome.trim(),
      foto: formProdutoFinal.foto,
      criadoEm: Date.now(),
    };

    try {
      await cadastrarProdutoFinal(novoProdutoFinal);
      setFormProdutoFinal(produtoFinalInicial);
    } catch (error) {
      setErroProdutoFinal(error.message);
    }
  }

  async function removerProdutoFinal(id) {
    setErroProdutoFinal("");

    try {
      await excluirProdutoFinal(id);
    } catch (error) {
      setErroProdutoFinal(error.message);
    }
  }

  async function registrarUsoAula() {
    const quantidadeDisponivel = Number(produtoRegistroUso?.quantidadeKg || 0);
    const quantidadeProduto = Number(registroUso.produto || 0);
    const quantidadeSucata = Number(registroUso.sucata || 0);
    const quantidadeEstoque = Number(registroUso.estoque || 0);
    const quantidadePerda = Number(registroUso.perda || 0);
    const sobraVoltaParaPrincipal = registroUso.destinoEstoque === estoquePrincipal;

    setErroRegistroUso("");

    if (!produtoRegistroUso) {
      setErroRegistroUso("Selecione o material usado na aula.");
      return;
    }

    if (!registroUso.aluno.trim()) {
      setErroRegistroUso("Informe o nome do aluno ou turma.");
      return;
    }

    if (quantidadeRegistroRetirada <= 0) {
      setErroRegistroUso("Informe uma quantidade retirada maior que zero.");
      return;
    }

    if (quantidadeRegistroRetirada > quantidadeDisponivel) {
      setErroRegistroUso("A quantidade retirada nao pode ser maior que o balde.");
      return;
    }

    if (
      quantidadeProduto < 0 ||
      quantidadeSucata < 0 ||
      quantidadeEstoque < 0 ||
      quantidadePerda < 0
    ) {
      setErroRegistroUso("As quantidades nao podem ser negativas.");
      return;
    }

    if (quantidadeProduto > 0 && !produtoFinalSelecionado) {
      setErroRegistroUso("Selecione qual produto final foi feito.");
      return;
    }

    if (totalRegistroJustificado > quantidadeRegistroRetirada) {
      setErroRegistroUso("A soma das quantidades nao pode passar do que foi retirado.");
      return;
    }

    if (registroUsoPrecisaJustificativa && !registroUso.justificativa.trim()) {
      setErroRegistroUso("A conta nao fechou. Escreva uma justificativa.");
      return;
    }

    const quantidadeQueSaiDoBalde = sobraVoltaParaPrincipal
      ? quantidadeRegistroRetirada
      : Number((quantidadeRegistroRetirada - quantidadeEstoque).toFixed(2));
    const novoEstoquePequeno = Number(
      (quantidadeDisponivel - quantidadeQueSaiDoBalde).toFixed(2),
    );
    const produtoNoEstoquePrincipal = produtosPrincipal.find(
      (produtoPrincipal) =>
        normalizarCodigo(produtoPrincipal.codigo) ===
        normalizarCodigo(produtoRegistroUso.codigo),
    );
    const tipoMovimentacao = registroUsoPrecisaJustificativa
      ? "pendencia-uso"
      : "uso-aula";

    try {
      await atualizarProduto(produtoRegistroUso.id, {
        quantidadeKg: novoEstoquePequeno,
      });

      if (sobraVoltaParaPrincipal && quantidadeEstoque > 0) {
        if (produtoNoEstoquePrincipal) {
          await atualizarProduto(produtoNoEstoquePrincipal.id, {
            quantidadeKg: Number(
              (
                Number(produtoNoEstoquePrincipal.quantidadeKg || 0) +
                quantidadeEstoque
              ).toFixed(2),
            ),
          });
        } else {
          await cadastrarProduto({
            ...produtoRegistroUso,
            quantidadeKg: quantidadeEstoque,
            tipoEstoque: estoquePrincipal,
          });
        }
      }

      await cadastrarMovimentacao({
        tipo: tipoMovimentacao,
        titulo: registroUsoPrecisaJustificativa
          ? "Pendencia de uso em aula"
          : "Uso de material em aula",
        produto: produtoRegistroUso,
        quantidadeKg: quantidadeRegistroRetirada,
        origem: "Estoque Pequeno",
        destino: "Registro de aula",
        usuario: registroUso.aluno.trim(),
        produtoFinal: quantidadeProduto > 0 ? produtoFinalSelecionado : null,
        fechamento: {
          retirado: quantidadeRegistroRetirada,
          produto: quantidadeProduto,
          sucata: quantidadeSucata,
          estoque: quantidadeEstoque,
          destinoEstoque: sobraVoltaParaPrincipal
            ? "Estoque Principal"
            : "Estoque Pequeno",
          perda: quantidadePerda,
          diferenca: diferencaRegistroUso,
        },
        justificativa: registroUso.justificativa.trim(),
        descricao:
          `${registroUso.aluno.trim()} registrou ${quantidadeRegistroRetirada} ` +
          `${obterUnidadeProduto(produtoRegistroUso)} de ${produtoRegistroUso.nome}.`,
      });

      fecharRegistroUsoAula();
    } catch (error) {
      setErroRegistroUso(error.message);
    }
  }

  async function registrarUsoEstoquePequeno(produto) {
    if (!usuarioAdmin) {
      setErroEstoquePequeno("Apenas professores/admins podem registrar uso.");
      return;
    }

    const quantidadeUtilizada = Number(usosEstoquePequeno[produto.id] || 0);
    const quantidadeDisponivel = Number(produto.quantidadeKg || 0);
    const justificativaSelecionada = justificativasUsoEstoquePequeno[produto.id];
    const justificativa = opcoesJustificativaUso.find(
      (opcao) => opcao.valor === justificativaSelecionada,
    );

    setErroEstoquePequeno("");

    if (!justificativa) {
      setErroEstoquePequeno("Selecione a justificativa do material.");
      return;
    }

    if (quantidadeUtilizada <= 0) {
      setErroEstoquePequeno(
        "Informe uma quantidade maior que zero para registrar o uso.",
      );
      return;
    }

    if (quantidadeUtilizada > quantidadeDisponivel) {
      setErroEstoquePequeno(
        "A quantidade utilizada nao pode ser maior que o disponivel no Estoque Pequeno.",
      );
      return;
    }

    try {
      await atualizarProduto(produto.id, {
        quantidadeKg: Number((quantidadeDisponivel - quantidadeUtilizada).toFixed(2)),
      });

      if (justificativa.valor === "estoque") {
        const produtoNoEstoquePrincipal = produtosPrincipal.find(
          (produtoPrincipal) =>
            normalizarCodigo(produtoPrincipal.codigo) === normalizarCodigo(produto.codigo),
        );

        if (produtoNoEstoquePrincipal) {
          await atualizarProduto(produtoNoEstoquePrincipal.id, {
            quantidadeKg: Number(
              (
                Number(produtoNoEstoquePrincipal.quantidadeKg || 0) +
                quantidadeUtilizada
              ).toFixed(2),
            ),
          });
        } else {
          await cadastrarProduto({
            ...produto,
            quantidadeKg: quantidadeUtilizada,
            tipoEstoque: estoquePrincipal,
          });
        }
      }

      await cadastrarMovimentacao({
        tipo: justificativa.valor === "estoque" ? "devolucao" : justificativa.valor,
        titulo: `Justificativa: ${justificativa.titulo}`,
        produto,
        quantidadeKg: quantidadeUtilizada,
        origem: "Estoque Pequeno",
        destino: justificativa.destino,
        finalidade: justificativa.titulo,
        descricao:
          `${quantidadeUtilizada} ${obterUnidadeProduto(produto)} de ` +
          `${produto.nome} foram registrados como ${justificativa.titulo}.`,
      });

      setUsosEstoquePequeno({
        ...usosEstoquePequeno,
        [produto.id]: "",
      });
      setJustificativasUsoEstoquePequeno({
        ...justificativasUsoEstoquePequeno,
        [produto.id]: "",
      });
    } catch (error) {
      setErroEstoquePequeno(error.message);
    }
  }

  async function devolverSobraEstoquePequeno(produto) {
    if (!usuarioAdmin) {
      setErroEstoquePequeno("Apenas professores/admins podem registrar sobra.");
      return;
    }

    const quantidadeDevolvida = Number(devolucoesEstoquePequeno[produto.id] || 0);
    const quantidadeDisponivel = Number(produto.quantidadeKg || 0);
    const destinoDevolucao =
      destinosDevolucaoEstoquePequeno[produto.id] || estoquePrincipal;
    const produtoNoEstoquePrincipal = produtosPrincipal.find(
      (produtoPrincipal) =>
        normalizarCodigo(produtoPrincipal.codigo) === normalizarCodigo(produto.codigo),
    );

    setErroEstoquePequeno("");

    if (quantidadeDevolvida <= 0) {
      setErroEstoquePequeno(
        "Informe uma quantidade maior que zero para devolver a sobra.",
      );
      return;
    }

    if (quantidadeDevolvida > quantidadeDisponivel) {
      setErroEstoquePequeno(
        "A quantidade devolvida nao pode ser maior que o disponivel no Estoque Pequeno.",
      );
      return;
    }

    if (destinoDevolucao === estoquePrincipal && !produtoNoEstoquePrincipal) {
      setErroEstoquePequeno(
        "Nao encontrei esse produto no Estoque Principal para devolver a sobra.",
      );
      return;
    }

    try {
      if (destinoDevolucao === estoquePrincipal) {
        await atualizarProduto(produto.id, {
          quantidadeKg: Number(
            (quantidadeDisponivel - quantidadeDevolvida).toFixed(2),
          ),
        });

        await atualizarProduto(produtoNoEstoquePrincipal.id, {
          quantidadeKg: Number(
            (
              Number(produtoNoEstoquePrincipal.quantidadeKg || 0) +
              quantidadeDevolvida
            ).toFixed(2),
          ),
        });
      }

      await cadastrarMovimentacao({
        tipo: "devolucao",
        titulo:
          destinoDevolucao === estoquePrincipal
            ? "Sobra devolvida ao Estoque Principal"
            : "Sobra mantida no Estoque Pequeno",
        produto,
        quantidadeKg: quantidadeDevolvida,
        origem: "Estoque Pequeno",
        destino:
          destinoDevolucao === estoquePrincipal
            ? "Estoque Principal"
            : "Estoque Pequeno",
        finalidade: "Devolucao de sobra",
        descricao:
          destinoDevolucao === estoquePrincipal
            ? `${quantidadeDevolvida} ${obterUnidadeProduto(produto)} de ${produto.nome} voltaram do Estoque Pequeno para o Estoque Principal.`
            : `${quantidadeDevolvida} ${obterUnidadeProduto(produto)} de ${produto.nome} foram mantidos no Estoque Pequeno como sobra.`,
      });

      setDevolucoesEstoquePequeno({
        ...devolucoesEstoquePequeno,
        [produto.id]: "",
      });
    } catch (error) {
      setErroEstoquePequeno(error.message);
    }
  }

  async function devolverKgProduto(produto) {
    if (!usuarioAdmin) {
      setErroFicha("Apenas professores/admins podem devolver material.");
      return;
    }

    const quantidadeDevolvida = Number(devolucoesFicha[produto.id] || 0);
    const saldoParaDevolver = calcularSaldoParaDevolver(produto);

    setErroFicha("");

    if (quantidadeDevolvida <= 0) {
      setErroFicha("Informe uma quantidade maior que zero para devolver.");
      return;
    }

    if (quantidadeDevolvida > saldoParaDevolver) {
      setErroFicha(
        `Voce so pode devolver ate ${saldoParaDevolver} ${obterUnidadeProduto(produto)}, que foi retirado e ainda nao voltou.`,
      );
      return;
    }

    try {
      await atualizarProduto(produto.id, {
        quantidadeKg: Number(produto.quantidadeKg || 0) + quantidadeDevolvida,
      });
      await cadastrarMovimentacao({
        tipo: "devolucao",
        titulo: "Quantidade devolvida ao estoque",
        produto,
        quantidadeKg: quantidadeDevolvida,
        origem: "Retirada direta",
        destino: "Estoque Principal",
        descricao: `${quantidadeDevolvida} ${obterUnidadeProduto(produto)} foram devolvidos para ${produto.nome}.`,
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
      setErroUso("Informe uma quantidade maior que zero.");
      return;
    }

    if (
      etapaUso === 2 &&
      Number(kgRetirado) > Number(produtoEmUso.quantidadeKg || 0)
    ) {
      setErroUso("A quantidade movimentada nao pode ser maior que o estoque.");
      return;
    }

    setEtapaUso(etapaUso + 1);
  }

  async function confirmarUsoProduto() {
    if (!usuarioAdmin) {
      setErroUso("Apenas professores/admins podem movimentar produtos.");
      return;
    }

    if (!produtoEmUso) {
      setErroUso("Escolha um produto antes de confirmar.");
      return;
    }

    const abasteceEstoquePequeno = tipoDeUso === "abastecer-pequeno";
    const retiradaEmergencial = tipoDeUso === "retirada-emergencial";
    const estoqueAtual = Number(produtoEmUso.quantidadeKg || 0);
    const novoEstoque = estoqueAtual - quantidadeRetiradaNumero;

    if (retiradaEmergencial) {
      const confirmouRetiradaEmergencial = window.confirm(
        "Essa retirada vai sair direto do Estoque Principal, sem passar pelo Estoque Pequeno. Confirma que e uma retirada emergencial?",
      );

      if (!confirmouRetiradaEmergencial) {
        return;
      }
    }

    try {
      await atualizarProduto(produtoEmUso.id, {
        quantidadeKg: novoEstoque,
      });

      if (abasteceEstoquePequeno) {
        const produtoNoEstoquePequeno = produtosPequeno.find(
          (produto) =>
            normalizarCodigo(produto.codigo) === normalizarCodigo(produtoEmUso.codigo),
        );

        if (produtoNoEstoquePequeno) {
          await atualizarProduto(produtoNoEstoquePequeno.id, {
            quantidadeKg:
              Number(produtoNoEstoquePequeno.quantidadeKg || 0) +
              quantidadeRetiradaNumero,
          });
        } else {
          await cadastrarProduto({
            nome: produtoEmUso.nome,
            fornecedor: produtoEmUso.fornecedor,
            codigo: produtoEmUso.codigo,
            descricao: produtoEmUso.descricao,
            quantidadeKg: quantidadeRetiradaNumero,
            unidadeMedida: obterUnidadeProduto(produtoEmUso),
            tipoEstoque: estoquePequeno,
          });
        }
      }

      await cadastrarMovimentacao({
        tipo: abasteceEstoquePequeno ? "transferencia" : "retirada_emergencial",
        titulo:
          abasteceEstoquePequeno
            ? "Abastecimento do Estoque Pequeno"
            : "Retirada emergencial do Principal",
        produto: produtoEmUso,
        quantidadeKg: quantidadeRetiradaNumero,
        origem: "Estoque Principal",
        destino: abasteceEstoquePequeno
          ? "Estoque Pequeno"
          : "Retirada emergencial",
        finalidade: abasteceEstoquePequeno
          ? "Abastecer baldes de aula"
          : "Uso emergencial direto",
        descricao:
          abasteceEstoquePequeno
            ? `${quantidadeRetiradaNumero} ${obterUnidadeProduto(produtoEmUso)} de ${produtoEmUso.nome} foram transferidos do Estoque Principal para o Estoque Pequeno.`
            : `${quantidadeRetiradaNumero} ${obterUnidadeProduto(produtoEmUso)} de ${produtoEmUso.nome} foram retirados diretamente do Estoque Principal em modo emergencial.`,
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

  function entrarNoSistema() {
    setIntroJaVista(true);
    setAbaAtiva("painel");
    setMostrarTelaInicial(false);
  }

  function voltarParaTelaInicial() {
    setModalUsoAberto(false);
    setModalFichaAberto(false);
    setModalEstoquePequenoAberto(false);
    setModalAcessoAberto(false);
    setModalHistoricoAberto(false);
    setModalEntradaAberto(false);
    setModalTodosProdutosAberto(false);
    setMostrarTelaInicial(true);
  }

  const abasSistema = [
    {
      id: "painel",
      titulo: "Painel",
      descricao: "Visao simples do que precisa de atencao.",
      icone: LayoutDashboard,
      somenteAdmin: false,
    },
    {
      id: "entrada",
      titulo: "Itens cadastrados",
      descricao: "Lista completa dos materiais.",
      icone: PackageSearch,
      somenteAdmin: false,
    },
    {
      id: "principal",
      titulo: "Principal",
      descricao: "Pavilhao e estoque grande.",
      icone: Warehouse,
      somenteAdmin: false,
    },
    {
      id: "pequeno",
      titulo: "Pequeno",
      descricao: "Baldes usados nas aulas.",
      icone: Boxes,
      somenteAdmin: false,
    },
    {
      id: "movimentacoes",
      titulo: "Movimentacoes",
      descricao: "Historico de tudo que aconteceu.",
      icone: ClipboardList,
      somenteAdmin: false,
    },
    {
      id: "admin",
      titulo: "Admin",
      descricao: "Configuracoes administrativas.",
      icone: Settings,
      somenteAdmin: true,
    },
  ];
  const abasVisiveis = abasSistema.filter((aba) => usuarioAdmin || !aba.somenteAdmin);
  const abaAtual =
    abasVisiveis.find((aba) => aba.id === abaAtiva) || abasVisiveis[0];
  const produtosComEstoqueBaixo = produtos.filter(
    (produto) =>
      obterStatusEstoque(produto.quantidadeKg, obterConfiguracoesEstoqueProduto(produto)).classe === "low",
  );
  const pendenciasUsoAula = movimentacoes.filter(
    (movimentacao) => movimentacao.tipo === "pendencia-uso",
  );
  const graficosPainel = [
    {
      titulo: "Estoque Principal",
      descricao: "Materiais no pavilhao",
      icone: Warehouse,
      destino: "principal",
      totais: totaisEstoquePrincipal,
      porcentagem: calcularPorcentagemGrafico(
        totaisEstoquePrincipal.totalVisual,
        maiorTotalGrafico,
      ),
    },
    {
      titulo: "Estoque Pequeno",
      descricao: "Materiais nos baldes",
      icone: Boxes,
      destino: "pequeno",
      totais: totaisEstoquePequeno,
      porcentagem: calcularPorcentagemGrafico(
        totaisEstoquePequeno.totalVisual,
        maiorTotalGrafico,
      ),
    },
    {
      titulo: "Moinho",
      descricao: "Area preparada",
      icone: Container,
      destino: "painel",
      totais: totaisMoinho,
      porcentagem: calcularPorcentagemGrafico(
        totaisMoinho.totalVisual,
        maiorTotalGrafico,
      ),
    },
  ];

  if (!tokenAcesso && mostrarTelaInicial) {
    return (
      <div className={modoEscuro ? "app dark-mode" : "app"}>
        <main className="intro-screen">
          <section
            className={
              introJaVista ? "intro-stage intro-stage-ready" : "intro-stage"
            }
            aria-label="Tela inicial do Storage"
          >
            <div className="industry-drawing" aria-hidden="true">
              <div className="intro-icon-sequence">
                <FlaskConical className="intro-object-icon chemistry-icon" />
                <RulerDimensionLine className="intro-object-icon ruler-icon" />
                <Container className="intro-object-icon storage-icon" />
                <strong className="welcome-draw">Bem-vindo</strong>
              </div>
            </div>

            <div className="intro-brand">
              <img src={senaiLogo} alt="SENAI" />
              <div className="intro-brand-text">
                <h1>STORAGE</h1>
                <p>Controle de materiais e movimentacoes.</p>
              </div>
            </div>

            <section className="welcome-panel">
              <div className="intro-entry-panel">
                <button
                  type="button"
                  className="intro-action-card primary"
                  onClick={entrarNoSistema}
                >
                  <strong>Entrar no painel</strong>
                </button>
              </div>
            </section>
          </section>

          {modalAcessoAberto && (
            <div className="usage-overlay">
              <section className="usage-modal access-modal">
                <div className="usage-header">
                  <div>
                    <span>{linksAcesso.length} link(s) criado(s)</span>
                    <h2>Gerar link de acesso</h2>
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
        </main>
      </div>
    );
  }

  if (tokenAcesso) {
    return (
      <div className={modoEscuro ? "app dark-mode" : "app"}>
        <header className="header">
          <div>
            <h1>Acesso de cliente</h1>
            <p>Consulta temporaria de produtos</p>
          </div>

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
                      <span>
                        Estoque: {produto.quantidadeKg ?? 0}{" "}
                        {obterUnidadeProduto(produto)}
                      </span>
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

  if (!tokenAcesso && !mostrarTelaInicial) {
    return (
      <div className={modoEscuro ? "app dark-mode" : "app"}>
        <div
          className={
            menuLateralAberto
              ? "system-shell"
              : "system-shell side-menu-collapsed"
          }
        >
          <aside className="side-menu">
            <div className="side-brand">
              <img src={senaiLogo} alt="SENAI" />
              <div>
                <strong>STORAGE</strong>
                <span>Sistema de estoque</span>
              </div>
              <button
                type="button"
                className="side-collapse-button"
                onClick={() => setMenuLateralAberto(!menuLateralAberto)}
                aria-label={
                  menuLateralAberto ? "Recuar menu lateral" : "Abrir menu lateral"
                }
                title={
                  menuLateralAberto ? "Recuar menu lateral" : "Abrir menu lateral"
                }
              >
                {menuLateralAberto ? (
                  <ChevronLeft size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
            </div>

            <nav className="side-nav" aria-label="Menu principal">
              {abasVisiveis.map((aba) => {
                const IconeAba = aba.icone;

                return (
                  <button
                    type="button"
                    className={
                      abaAtiva === aba.id ? "side-nav-item active" : "side-nav-item"
                    }
                    key={aba.id}
                    onClick={() => trocarAba(aba.id)}
                    title={aba.titulo}
                  >
                    <IconeAba size={20} />
                    <span className="side-nav-copy">
                      <strong>{aba.titulo}</strong>
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="side-footer">
              <div className="sidebar-role-switch" aria-label="Perfil temporario">
                <button
                  type="button"
                  className={
                    usuarioAdmin ? "sidebar-role-option active" : "sidebar-role-option"
                  }
                  onClick={() => trocarPerfilSistema(perfilAdmin)}
                  title="Perfil professor"
                >
                  <ShieldCheck size={16} />
                  <span>Professor</span>
                </button>

                <button
                  type="button"
                  className={
                    !usuarioAdmin ? "sidebar-role-option active" : "sidebar-role-option"
                  }
                  onClick={() => trocarPerfilSistema(perfilAluno)}
                  title="Perfil aluno"
                >
                  <GraduationCap size={16} />
                  <span>Aluno</span>
                </button>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={alternarTema}
              >
                {modoEscuro ? <Sun size={18} /> : <Moon size={18} />}
                <span>{modoEscuro ? "Modo claro" : "Modo escuro"}</span>
              </button>
            </div>
          </aside>

          <main className="system-main">
            <header className="system-header">
              <div>
                <span>Storage SENAI</span>
                <h1>{abaAtual.titulo}</h1>
              </div>

              <div className="system-header-actions">
                <span className={usuarioAdmin ? "profile-pill admin" : "profile-pill student"}>
                  {usuarioAdmin ? <ShieldCheck size={16} /> : <GraduationCap size={16} />}
                  {usuarioAdmin ? "Professor" : "Aluno"}
                </span>

                <button
                  type="button"
                  className="utility-button"
                  onClick={alternarTema}
                  aria-label={modoEscuro ? "Ativar modo claro" : "Ativar modo escuro"}
                  title={modoEscuro ? "Ativar modo claro" : "Ativar modo escuro"}
                >
                  {modoEscuro ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>
            </header>

            {!firebaseConfigurado && (
              <div className="firebase-warning">
                Configure suas credenciais em src/firebaseconfig.js para ativar o
                CRUD com Firebase.
              </div>
            )}

            {abaAtiva === "painel" && (
              <section className="panel-page">
                <div className="panel-hero">
                  <div>
                    <span>Painel</span>
                    <h2>Resumo do estoque</h2>
                  </div>

                  {usuarioAdmin && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={abrirEntradaProduto}
                    >
                      <PackagePlus size={18} />
                      Nova entrada
                    </button>
                  )}
                </div>

                {usuarioAdmin && pendenciasUsoAula.length > 0 && (
                  <div className="admin-alert">
                    <AlertTriangle size={28} />
                    <div>
                      <strong>Existem usos de aula com conta aberta</strong>
                      <p>
                        {pendenciasUsoAula.length} registro(s) precisam ser
                        revisados pelo professor.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => trocarAba("movimentacoes")}
                    >
                      Ver movimentacoes
                    </button>
                  </div>
                )}

                <div className="stock-gauge-grid">
                  {graficosPainel.map((grafico) => {
                    const IconeGrafico = grafico.icone;

                    return (
                      <button
                        type="button"
                        className="stock-gauge-card"
                        key={grafico.titulo}
                        onClick={() => trocarAba(grafico.destino)}
                      >
                        <div className="stock-gauge-top">
                          <span>{grafico.descricao}</span>
                          <IconeGrafico size={22} />
                        </div>

                        <div
                          className="semi-gauge"
                          style={{
                            "--gauge-angle": `${grafico.porcentagem * 1.8}deg`,
                          }}
                          aria-hidden="true"
                        >
                          <div className="semi-gauge-center">
                            <strong>{grafico.porcentagem}%</strong>
                          </div>
                        </div>

                        <div className="stock-gauge-info">
                          <h3>{grafico.titulo}</h3>
                          <div>
                            <span>{grafico.totais.kg} kg</span>
                            <span>{grafico.totais.gramas} g</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="dashboard-grid">
                  <button
                    type="button"
                    className="dashboard-card"
                    onClick={() => trocarAba("principal")}
                  >
                    <Warehouse className="dashboard-card-icon" size={24} />
                    <span>Estoque Principal</span>
                    <strong>{produtosPrincipal.length}</strong>
                  </button>

                  <button
                    type="button"
                    className="dashboard-card"
                    onClick={() => trocarAba("pequeno")}
                  >
                    <Boxes className="dashboard-card-icon" size={24} />
                    <span>Estoque Pequeno</span>
                    <strong>{produtosPequeno.length}</strong>
                  </button>

                  <button
                    type="button"
                    className="dashboard-card attention"
                    onClick={() => trocarAba("principal")}
                  >
                    <AlertTriangle className="dashboard-card-icon" size={24} />
                    <span>Atenção</span>
                    <strong>{produtosComEstoqueBaixo.length}</strong>
                  </button>
                </div>
              </section>
            )}

            {abaAtiva === "entrada" && (
              <section className="tab-page products-container">
                <div className="products-header">
                  <div>
                    <h2>Itens cadastrados</h2>
                    <span>{produtos.length} produto(s) no sistema</span>
                  </div>

                  {usuarioAdmin ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={abrirEntradaProduto}
                    >
                      <PackagePlus size={18} />
                      Nova entrada
                    </button>
                  ) : (
                    <span className="read-only-note">Visualizacao do aluno</span>
                  )}
                </div>

                <div className="modal-filter-bar inline-filter-bar">
                  <div className="search-input-wrap">
                    <Search size={18} />
                    <input
                      type="text"
                      className="usage-search"
                      placeholder="Buscar por nome ou codigo..."
                      value={buscaTodosProdutos}
                      onChange={(event) => {
                        setBuscaTodosProdutos(event.target.value);
                        setPaginaTodosProdutos(1);
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    className="filter-icon-button"
                    aria-label="Filtro"
                    title="Filtro por nome ou codigo"
                  >
                    <Filter size={18} />
                  </button>
                </div>

                <div className="registered-items-table">
                  <div className="registered-items-head" aria-hidden="true">
                    <span>Produto</span>
                    <span>Codigo</span>
                    <span>Fornecedor</span>
                    <span>Quantidade</span>
                    <span>Acoes</span>
                  </div>

                  <div className="registered-items-list">
                    {produtosPaginadosTodos.map((produto) => (
                      <article className="registered-item-row" key={produto.id}>
                        <div className="registered-item-main">
                          <h3>{produto.nome}</h3>
                          <p>{produto.descricao}</p>
                        </div>

                        <div className="registered-item-code">
                          <small>Codigo</small>
                          <strong title={produto.codigo}>{produto.codigo}</strong>
                        </div>

                        <div className="registered-item-supplier">
                          <small>Fornecedor</small>
                          <strong title={produto.fornecedor}>
                            {produto.fornecedor}
                          </strong>
                        </div>

                        <div className="registered-item-meta">
                          <span className="stock-value">
                            <small>Quantidade</small>
                            <strong className="stock-quantity">
                              {produto.quantidadeKg ?? 0}{" "}
                              {obterUnidadeProduto(produto)}
                            </strong>
                          </span>
                        </div>

                        <div className="registered-item-actions">
                          {usuarioAdmin ? (
                            <>
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
                            </>
                          ) : (
                            <span className="read-only-note compact">Consulta</span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                {produtosFiltradosTodos.length === 0 && (
                  <p className="usage-empty">Nenhum item cadastrado encontrado.</p>
                )}

                {produtosFiltradosTodos.length > itensPorPaginaProdutos && (
                  <div className="modal-pagination">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() =>
                        setPaginaTodosProdutos((pagina) => Math.max(1, pagina - 1))
                      }
                      disabled={paginaAtualTodosProdutos === 1}
                      aria-label="Pagina anterior"
                      title="Pagina anterior"
                    >
                      <ChevronLeft size={22} />
                    </button>

                    <span>
                      {paginaAtualTodosProdutos} de {totalPaginasTodosProdutos}
                    </span>

                    <button
                      type="button"
                      className="icon-button"
                      onClick={() =>
                        setPaginaTodosProdutos((pagina) =>
                          Math.min(totalPaginasTodosProdutos, pagina + 1),
                        )
                      }
                      disabled={
                        paginaAtualTodosProdutos === totalPaginasTodosProdutos
                      }
                      aria-label="Proxima pagina"
                      title="Proxima pagina"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </div>
                )}
              </section>
            )}

            {abaAtiva === "principal" && (
              <section className="tab-page products-container">
                <div className="products-header">
                  <div>
                    <h2>Estoque Principal</h2>
                    <span>{produtosPrincipal.length} item(ns) no pavilhao</span>
                  </div>

                  {usuarioAdmin ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={abrirUsoProduto}
                      disabled={produtosPrincipal.length === 0}
                    >
                      <Send size={18} />
                      Abastecer baldes
                    </button>
                  ) : (
                    <span className="read-only-note">Visualizacao do aluno</span>
                  )}
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
                    const statusEstoque = obterStatusEstoque(produto.quantidadeKg, obterConfiguracoesEstoqueProduto(produto));
                    const saldoParaDevolver = calcularSaldoParaDevolver(produto);

                    return (
                      <article className="stock-sheet-item" key={produto.id}>
                        <div>
                          <strong>{produto.nome}</strong>
                          <span>Codigo: {produto.codigo}</span>
                          <span>Fornecedor: {produto.fornecedor}</span>
                          <span>Descricao: {produto.descricao}</span>
                        </div>

                        <div>
                          <strong className="stock-quantity">
                            {produto.quantidadeKg ?? 0} {obterUnidadeProduto(produto)}
                          </strong>
                          <span>Unidade: {obterUnidadeProduto(produto)}</span>
                          <span className={`stock-pill ${statusEstoque.classe}`}>
                            {statusEstoque.texto}
                          </span>
                        </div>

                        <p>{statusEstoque.descricao}</p>

                        {usuarioAdmin && saldoParaDevolver > 0 && (
                          <div className="stock-return">
                            <label>
                              Devolver sobra de retirada emergencial
                              <span>
                                Pendente: {saldoParaDevolver}{" "}
                                {obterUnidadeProduto(produto)}
                              </span>
                              <input
                                type="number"
                                min="0"
                                max={saldoParaDevolver}
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
                              Devolver ao Principal
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                {produtosFiltradosFicha.length === 0 && (
                  <p className="usage-empty">Nenhum produto encontrado.</p>
                )}
              </section>
            )}

            {abaAtiva === "pequeno" && (
              <section className="tab-page products-container">
                <div className="products-header">
                  <div>
                    <h2>Estoque Pequeno</h2>
                    <span>{produtosPequeno.length} item(ns) nos baldes</span>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={abrirRegistroUsoAula}
                    disabled={produtosPequeno.length === 0}
                  >
                    <ClipboardList size={18} />
                    Registrar uso
                  </button>
                </div>

                <input
                  type="text"
                  className="usage-search"
                  placeholder="Filtrar por nome ou codigo..."
                  value={buscaEstoquePequeno}
                  onChange={(event) => setBuscaEstoquePequeno(event.target.value)}
                />

                {erroEstoquePequeno && <p className="form-error">{erroEstoquePequeno}</p>}

                <div className="stock-sheet">
                  {produtosFiltradosEstoquePequeno.map((produto) => {
                    const statusEstoque = obterStatusEstoque(produto.quantidadeKg, obterConfiguracoesEstoqueProduto(produto));

                    return (
                      <article className="stock-sheet-item small-stock" key={produto.id}>
                        <div>
                          <strong>{produto.nome}</strong>
                          <span>Codigo: {produto.codigo}</span>
                          <span>Fornecedor: {produto.fornecedor}</span>
                          <span>Descricao: {produto.descricao}</span>
                        </div>

                        <div>
                          <strong className="stock-quantity">
                            {produto.quantidadeKg ?? 0} {obterUnidadeProduto(produto)}
                          </strong>
                          <span>Unidade: {obterUnidadeProduto(produto)}</span>
                          <span className={`stock-pill ${statusEstoque.classe}`}>
                            {statusEstoque.texto}
                          </span>
                        </div>

                        <p className="read-only-note stock-note">
                          Para fechar uma aula, use o botao Registrar uso.
                        </p>
                      </article>
                    );
                  })}
                </div>

                {produtosFiltradosEstoquePequeno.length === 0 && (
                  <p className="usage-empty">Nenhum produto encontrado.</p>
                )}
              </section>
            )}

            {abaAtiva === "movimentacoes" && (
              <section className="tab-page products-container">
                <div className="products-header">
                  <div>
                    <h2>Movimentacoes</h2>
                    <span>{movimentacoes.length} registro(s)</span>
                  </div>
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
                          <span>
                            Produto: {movimentacao.produto.nome || "Nao informado"}
                          </span>
                          <span>
                            Codigo: {movimentacao.produto.codigo || "Nao informado"}
                          </span>
                          <span>Tipo: {movimentacao.tipo || "Nao informado"}</span>
                          {movimentacao.quantidadeKg && (
                            <span>
                              Quantidade: {movimentacao.quantidadeKg}{" "}
                              {obterUnidadeProduto(movimentacao.produto)}
                            </span>
                          )}
                          {movimentacao.origem && (
                            <span>Origem: {movimentacao.origem}</span>
                          )}
                          {movimentacao.destino && (
                            <span>Destino: {movimentacao.destino}</span>
                          )}
                          {movimentacao.produtoFinal && (
                            <span>
                              Produto final: {movimentacao.produtoFinal.nome}
                            </span>
                          )}
                          {movimentacao.fechamento && (
                            <span>
                              Fechamento: retirado{" "}
                              {movimentacao.fechamento.retirado}, produto{" "}
                              {movimentacao.fechamento.produto}, sucata{" "}
                              {movimentacao.fechamento.sucata}, estoque{" "}
                              {movimentacao.fechamento.estoque}, perda{" "}
                              {movimentacao.fechamento.perda}
                            </span>
                          )}
                          {movimentacao.fechamento?.destinoEstoque && (
                            <span>
                              Destino da sobra:{" "}
                              {movimentacao.fechamento.destinoEstoque}
                            </span>
                          )}
                          {movimentacao.justificativa && (
                            <span>Justificativa: {movimentacao.justificativa}</span>
                          )}
                          <span>Usuario: {movimentacao.usuario || "Sistema"}</span>
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                {movimentacoes.length === 0 && (
                  <p className="usage-empty">Nenhuma movimentacao registrada.</p>
                )}
              </section>
            )}

            {usuarioAdmin && abaAtiva === "admin" && (
              <section className="tab-page admin-settings">
                <section className="form-container">
                  <div className="form-title">
                    <span>Administrativo</span>
                    <h2>Configurações do sistema</h2>
                  </div>

                  <div className="settings-grid">
                    <article className="settings-card">
                      <div className="settings-card-title">
                        <ShieldCheck size={20} />
                        <strong>Perfil atual</strong>
                      </div>

                      <p>
                        Controle temporario ate o login real ser conectado pelo
                        projeto.
                      </p>

                      <div className="role-switch">
                        <button
                          type="button"
                          className={
                            usuarioAdmin ? "role-option active" : "role-option"
                          }
                          onClick={() => trocarPerfilSistema(perfilAdmin)}
                        >
                          <ShieldCheck size={18} />
                          Professor
                        </button>

                        <button
                          type="button"
                          className={
                            !usuarioAdmin ? "role-option active" : "role-option"
                          }
                          onClick={() => trocarPerfilSistema(perfilAluno)}
                        >
                          <GraduationCap size={18} />
                          Aluno
                        </button>
                      </div>
                    </article>

                    <article className="settings-card">
                      <div className="settings-card-title">
                        <PackageSearch size={20} />
                        <strong>Permissões preparadas</strong>
                      </div>

                      <p>
                        Professor cadastra, edita, exclui e movimenta. Aluno
                        consulta os estoques e registra o uso da aula.
                      </p>
                    </article>

                    <article className="settings-card settings-card-wide final-products-card">
                      <div className="settings-card-title">
                        <PackagePlus size={20} />
                        <strong>Produtos finais</strong>
                      </div>

                      <p>
                        Cadastre os produtos que podem ser feitos em aula para o
                        aluno selecionar no registro de uso.
                      </p>

                      <form className="final-product-form" onSubmit={salvarProdutoFinal}>
                        <label>
                          Nome do produto final
                          <input
                            type="text"
                            name="nome"
                            maxLength="45"
                            placeholder="Ex: Chaveiro"
                            value={formProdutoFinal.nome}
                            onChange={atualizarCampoProdutoFinal}
                          />
                        </label>

                        <label>
                          Foto do produto
                          <input
                            type="file"
                            accept="image/*"
                            onChange={atualizarFotoProdutoFinal}
                          />
                        </label>

                        <button type="submit" className="btn-primary">
                          Cadastrar
                        </button>
                      </form>

                      {erroProdutoFinal && (
                        <p className="form-error">{erroProdutoFinal}</p>
                      )}

                      <div className="final-products-list">
                        {produtosFinais.map((produtoFinal) => (
                          <article className="final-product-card" key={produtoFinal.id}>
                            <div className="final-product-thumb">
                              {produtoFinal.foto ? (
                                <img src={produtoFinal.foto} alt={produtoFinal.nome} />
                              ) : (
                                <PackagePlus size={20} />
                              )}
                            </div>

                            <strong>{produtoFinal.nome}</strong>

                            <button
                              type="button"
                              className="icon-button delete"
                              onClick={() => removerProdutoFinal(produtoFinal.id)}
                              aria-label={`Remover ${produtoFinal.nome}`}
                              title="Remover"
                            >
                              <Trash2 size={18} />
                            </button>
                          </article>
                        ))}
                      </div>

                      {produtosFinais.length === 0 && (
                        <span className="settings-empty">
                          Nenhum produto final cadastrado ainda.
                        </span>
                      )}
                    </article>

                    <article className="settings-card">
                      <div className="settings-card-title">
                        <Settings size={20} />
                        <strong>Acesso temporario</strong>
                      </div>

                      <p>
                        Gere links de acesso enquanto a autenticacao definitiva
                        ainda nao entra no sistema.
                      </p>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setModalAcessoAberto(true)}
                      >
                        Gerar link
                      </button>
                    </article>
                  </div>
                </section>
              </section>
            )}
          </main>
        </div>

        {usuarioAdmin && modalAcessoAberto && (
          <div className="usage-overlay">
            <section className="usage-modal access-modal">
              <div className="usage-header">
                <div>
                  <span>{linksAcesso.length} link(s) criado(s)</span>
                  <h2>Gerar link de acesso</h2>
                </div>

                <button
                  type="button"
                  className="close-modal"
                  onClick={fecharDashboardAcesso}
                  aria-label="Fechar"
                  title="Fechar"
                >
                  <X size={20} />
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

        {modalRegistroUsoAberto && (
          <div className="usage-overlay">
            <section className="usage-modal class-usage-modal">
              <div className="usage-header">
                <div>
                  <span>Fechamento da aula</span>
                  <h2>Registrar uso de material</h2>
                </div>

                <button
                  type="button"
                  className="close-modal"
                  onClick={fecharRegistroUsoAula}
                  aria-label="Fechar"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="class-usage-grid">
                <section className="class-usage-block">
                  <div className="block-heading">
                    <span>1</span>
                    <div>
                      <strong>Quem usou e qual material?</strong>
                      <p>Selecione um item que esta no Estoque Pequeno.</p>
                    </div>
                  </div>

                  <label>
                    Aluno ou turma
                    <input
                      type="text"
                      name="aluno"
                      maxLength="45"
                      placeholder="Ex: Turma 2A"
                      value={registroUso.aluno}
                      onChange={atualizarCampoRegistroUso}
                    />
                  </label>

                  <div className="search-input-wrap class-usage-search">
                    <Search size={18} />
                    <input
                      type="text"
                      className="usage-search"
                      placeholder="Buscar material por nome ou codigo..."
                      value={buscaRegistroUso}
                      onChange={(event) => setBuscaRegistroUso(event.target.value)}
                    />
                  </div>

                  <div className="usage-products-list compact">
                    {produtosFiltradosRegistroUso.map((produto) => {
                      const selecionado = registroUso.produtoId === produto.id;

                      return (
                        <button
                          type="button"
                          className={
                            selecionado
                              ? "usage-product selected"
                              : "usage-product"
                          }
                          key={produto.id}
                          onClick={() =>
                            setRegistroUso({
                              ...registroUso,
                              produtoId: produto.id,
                            })
                          }
                        >
                          <strong>{produto.nome}</strong>
                          <span>
                            {produto.quantidadeKg ?? 0}{" "}
                            {obterUnidadeProduto(produto)} disponivel
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {produtosFiltradosRegistroUso.length === 0 && (
                    <p className="usage-empty">
                      Nenhum material disponivel nos baldes.
                    </p>
                  )}
                </section>

                <section className="class-usage-block">
                  <div className="block-heading">
                    <span>2</span>
                    <div>
                      <strong>Para onde foi o material?</strong>
                      <p>A soma precisa bater com a quantidade retirada.</p>
                    </div>
                  </div>

                  <label>
                    Quantidade retirada
                    {produtoRegistroUso && (
                      <span className="field-hint">
                        Disponivel: {produtoRegistroUso.quantidadeKg ?? 0}{" "}
                        {obterUnidadeProduto(produtoRegistroUso)}
                      </span>
                    )}
                    <input
                      type="number"
                      name="quantidadeRetirada"
                      min="0"
                      max={produtoRegistroUso?.quantidadeKg || undefined}
                      step="0.01"
                      placeholder="Ex: 10"
                      value={registroUso.quantidadeRetirada}
                      onChange={atualizarCampoRegistroUso}
                    />
                  </label>

                  <div className="usage-allocation-grid">
                    <label>
                      Produto
                      <input
                        type="number"
                        name="produto"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={registroUso.produto}
                        onChange={atualizarCampoRegistroUso}
                      />
                    </label>

                    <label>
                      Sucata
                      <input
                        type="number"
                        name="sucata"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={registroUso.sucata}
                        onChange={atualizarCampoRegistroUso}
                      />
                    </label>

                    <label>
                      Estoque
                      <input
                        type="number"
                        name="estoque"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={registroUso.estoque}
                        onChange={atualizarCampoRegistroUso}
                      />
                    </label>

                    <label>
                      Perda
                      <input
                        type="number"
                        name="perda"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={registroUso.perda}
                        onChange={atualizarCampoRegistroUso}
                      />
                    </label>
                  </div>

                  {Number(registroUso.estoque || 0) > 0 && (
                    <label>
                      Onde a sobra vai ficar?
                      <select
                        name="destinoEstoque"
                        value={registroUso.destinoEstoque}
                        onChange={atualizarCampoRegistroUso}
                      >
                        <option value={estoquePequeno}>Estoque Pequeno</option>
                        <option value={estoquePrincipal}>Estoque Principal</option>
                      </select>
                    </label>
                  )}

                  {Number(registroUso.produto || 0) > 0 && (
                    <label>
                      Produto final feito
                      <select
                        name="produtoFinalId"
                        value={registroUso.produtoFinalId}
                        onChange={atualizarCampoRegistroUso}
                      >
                        <option value="">Selecione o produto final</option>
                        {produtosFinais.map((produtoFinal) => (
                          <option value={produtoFinal.id} key={produtoFinal.id}>
                            {produtoFinal.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {Number(registroUso.produto || 0) > 0 &&
                    produtosFinais.length === 0 && (
                      <p className="usage-empty compact-message">
                        O professor precisa cadastrar produtos finais no
                        Administrativo.
                      </p>
                    )}

                  <div
                    className={
                      registroUsoPrecisaJustificativa
                        ? "calculation-card open"
                        : "calculation-card"
                    }
                  >
                    <span>Retirado: {quantidadeRegistroRetirada || 0}</span>
                    <span>Informado: {totalRegistroJustificado || 0}</span>
                    <strong>
                      {registroUsoPrecisaJustificativa
                        ? `Diferença: ${diferencaRegistroUso}`
                        : "Conta fechada"}
                    </strong>
                  </div>

                  {registroUsoPrecisaJustificativa && (
                    <label>
                      Justificativa para o professor
                      <textarea
                        name="justificativa"
                        maxLength="180"
                        placeholder="Explique o que aconteceu com a diferença."
                        value={registroUso.justificativa}
                        onChange={atualizarCampoRegistroUso}
                      />
                    </label>
                  )}
                </section>
              </div>

              {erroRegistroUso && <p className="form-error">{erroRegistroUso}</p>}

              <div className="usage-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={fecharRegistroUsoAula}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={registrarUsoAula}
                >
                  Registrar uso
                </button>
              </div>
            </section>
          </div>
        )}

        {modalUsoAberto && (
          <div className="usage-overlay">
            <section className="usage-modal">
              {usoConfirmado ? (
                <div className="success-state">
                  <div className="success-icon">
                    <Check size={42} />
                  </div>

                  <h2>Movimentacao confirmada</h2>
                  <p>
                    {quantidadeRetiradaNumero} {obterUnidadeProduto(produtoEmUso)}{" "}
                    de {produtoEmUso.nome}{" "}
                    {tipoDeUso === "abastecer-pequeno"
                      ? "foram enviados para o Estoque Pequeno."
                      : "foram retirados diretamente do Estoque Principal."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="usage-header">
                    <div>
                      <span>Etapa {etapaUso} de 3</span>
                      <h2>Abastecer baldes</h2>
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
                      <h3>Qual material vai sair do pavilhao?</h3>
                      <p className="usage-helper">
                        Escolha um item do Estoque Principal para abastecer os
                        baldes.
                      </p>

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
                            <span>
                              Estoque: {produto.quantidadeKg ?? 0}{" "}
                              {obterUnidadeProduto(produto)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {etapaUso === 2 && (
                    <div className="usage-step">
                      <h3>O que vai acontecer com esse material?</h3>

                      <div className="usage-options">
                        {opcoesMovimentacaoPrincipal.map((opcao) => (
                          <label
                            className={
                              tipoDeUso === opcao.valor
                                ? "usage-option selected"
                                : "usage-option"
                            }
                            key={opcao.valor}
                          >
                            <input
                              type="radio"
                              name="tipoDeUso"
                              value={opcao.valor}
                              checked={tipoDeUso === opcao.valor}
                              onChange={(event) => setTipoDeUso(event.target.value)}
                            />
                            <span>
                              <strong>{opcao.titulo}</strong>
                              <small>{opcao.descricao}</small>
                            </span>
                          </label>
                        ))}
                      </div>

                      <label className="kg-field">
                        Quantidade a movimentar ({obterUnidadeProduto(produtoEmUso)})
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
                      <h3>Revise antes de confirmar</h3>

                      <div className="review-card">
                        <p>
                          <strong>Produto:</strong> {produtoEmUso.nome}
                        </p>
                        <p>
                          <strong>Acao:</strong>{" "}
                          {movimentacaoPrincipalSelecionada?.titulo || "Nao informada"}
                        </p>
                        <p>
                          <strong>Quantidade:</strong> {kgRetirado}{" "}
                          {obterUnidadeProduto(produtoEmUso)}
                        </p>
                        {tipoDeUso === "retirada-emergencial" && (
                          <p className="review-warning">
                            Essa opcao pula os baldes e retira direto do Estoque
                            Principal.
                          </p>
                        )}
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

        {usuarioAdmin && modalEntradaAberto && (
          <div className="usage-overlay">
            <section className="usage-modal entry-modal">
              <div className="usage-header">
                <div>
                  <span>Entrada de material</span>
                  <h2>{produtoEditandoId ? "Editar produto" : "Cadastrar produto"}</h2>
                </div>

                <button
                  type="button"
                  className="close-modal"
                  onClick={fecharEntradaProduto}
                  aria-label="Fechar"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <form className="product-form modal-product-form" onSubmit={salvarProduto}>
                <div className="form-row">
                  <label>
                    Nome
                    <input
                      type="text"
                      name="nome"
                      maxLength="45"
                      placeholder="Ex: Polimero A"
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

                <div className="form-row stock-form-row">
                  <label className="quantity-field">
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

                  <label className="unit-field">
                    Quantidade
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

                  <label>
                    Unidade
                    <select
                      name="unidadeMedida"
                      value={formulario.unidadeMedida}
                      onChange={atualizarCampo}
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="un">un</option>
                      <option value="L">L</option>
                    </select>
                  </label>

                  <label className="stock-destination-field">
                    Destino
                    <select
                      name="tipoEstoque"
                      value={formulario.tipoEstoque}
                      onChange={atualizarCampo}
                    >
                      <option value="principal">Estoque Principal</option>
                      <option value="pequeno">Estoque Pequeno</option>
                    </select>
                    <span className="form-hint">
                      Mesmo codigo soma a quantidade no destino escolhido.
                    </span>
                  </label>
                </div>

                <div className="form-row alert-limit-row">
                  <label>
                    Repor estoque ate
                    <input
                      type="number"
                      name="limiteBaixo"
                      min="0"
                      step="0.01"
                      value={formulario.limiteBaixo}
                      onChange={atualizarCampo}
                    />
                    <span className="form-hint">
                      Quando chegar neste valor, pede reposicao.
                    </span>
                  </label>

                  <label>
                    Ficar atento ate
                    <input
                      type="number"
                      name="limiteAtencao"
                      min="0"
                      step="0.01"
                      value={formulario.limiteAtencao}
                      onChange={atualizarCampo}
                    />
                    <span className="form-hint">
                      Acima da reposicao, mas ainda em atencao.
                    </span>
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
                    {produtoEditandoId ? "Atualizar produto" : "Salvar entrada"}
                  </button>

                  {produtoEditandoId && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={fecharEntradaProduto}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>
        )}

        {modalTodosProdutosAberto && (
          <div className="usage-overlay">
            <section className="usage-modal all-products-modal">
              <div className="usage-header">
                <div>
                  <span>{produtos.length} produto(s)</span>
                  <h2>Produtos cadastrados</h2>
                </div>

                <button
                  type="button"
                  className="close-modal"
                  onClick={fecharTodosProdutos}
                  aria-label="Fechar"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-filter-bar">
                <div className="search-input-wrap">
                  <Search size={18} />
                  <input
                    type="text"
                    className="usage-search"
                    placeholder="Buscar por nome ou codigo..."
                    value={buscaTodosProdutos}
                    onChange={(event) => {
                      setBuscaTodosProdutos(event.target.value);
                      setPaginaTodosProdutos(1);
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="filter-icon-button"
                  aria-label="Filtro"
                  title="Filtro por nome ou codigo"
                >
                  <Filter size={18} />
                </button>
              </div>

              <div className="registered-items-table">
                <div className="registered-items-head" aria-hidden="true">
                  <span>Produto</span>
                  <span>Codigo</span>
                  <span>Fornecedor</span>
                  <span>Quantidade</span>
                  <span>Acoes</span>
                </div>

                <div className="registered-items-list">
                {produtosPaginadosTodos.map((produto) => (
                  <article className="registered-item-row" key={produto.id}>
                    <div className="registered-item-main">
                      <h3>{produto.nome}</h3>
                      <p>{produto.descricao}</p>
                    </div>

                    <div className="registered-item-code">
                      <small>Codigo</small>
                      <strong title={produto.codigo}>{produto.codigo}</strong>
                    </div>

                    <div className="registered-item-supplier">
                      <small>Fornecedor</small>
                      <strong title={produto.fornecedor}>{produto.fornecedor}</strong>
                    </div>

                    <div className="registered-item-meta">
                      <span className="stock-value">
                        <small>Quantidade</small>
                    <strong className="stock-quantity">
                      {produto.quantidadeKg ?? 0} {obterUnidadeProduto(produto)}
                    </strong>
                      </span>
                    </div>

                    <div className="registered-item-actions">
                      {usuarioAdmin ? (
                        <>
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
                        </>
                      ) : (
                        <span className="read-only-note compact">Consulta</span>
                      )}
                    </div>
                  </article>
                ))}
                </div>
              </div>

              {produtosFiltradosTodos.length === 0 && (
                <p className="usage-empty">Nenhum item cadastrado encontrado.</p>
              )}

              {produtosFiltradosTodos.length > itensPorPaginaProdutos && (
                <div className="modal-pagination">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() =>
                      setPaginaTodosProdutos((pagina) => Math.max(1, pagina - 1))
                    }
                    disabled={paginaAtualTodosProdutos === 1}
                    aria-label="Pagina anterior"
                    title="Pagina anterior"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <span>
                    {paginaAtualTodosProdutos} de {totalPaginasTodosProdutos}
                  </span>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() =>
                      setPaginaTodosProdutos((pagina) =>
                        Math.min(totalPaginasTodosProdutos, pagina + 1),
                      )
                    }
                    disabled={paginaAtualTodosProdutos === totalPaginasTodosProdutos}
                    aria-label="Proxima pagina"
                    title="Proxima pagina"
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        <button
          type="button"
          className="back-to-top"
          onClick={rolarParaTopo}
          aria-label="Voltar para o topo"
          title="Voltar para o topo"
        >
          <ArrowUp size={22} />
        </button>
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
            className="btn-secondary back-home-button"
            onClick={voltarParaTelaInicial}
          >
            Inicio
          </button>

          <button
            type="button"
            className="icon-action"
            onClick={abrirHistorico}
            aria-label="Abrir Historico"
            title="Abrir Historico"
          >
            <History size={23} />
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

        <section className="workflow-guide" aria-label="Guia rapido do estoque">
          <article>
            <span>1</span>
            <strong>Entrada de material</strong>
            <p>Cadastre ou some quantidade no estoque correto.</p>
          </article>

          <article>
            <span>2</span>
            <strong>Abastecer baldes</strong>
            <p>O Principal abastece o Estoque Pequeno.</p>
          </article>

          <article>
            <span>3</span>
            <strong>Registrar aula</strong>
            <p>No Estoque Pequeno, registre consumo ou sobra.</p>
          </article>
        </section>

        <section className="form-container">
          <div className="form-title">
            <span>Entrada de material</span>
            <h2>{produtoEditandoId ? "Editar produto" : "Cadastrar produto"}</h2>
          </div>

          <form className="product-form" onSubmit={salvarProduto}>
            <div className="form-row">
              <label>
                Nome
                <input
                  type="text"
                  name="nome"
                  maxLength="45"
                  placeholder="Ex: PolÃ­mero A"
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

            <div className="form-row stock-form-row">
              <label className="quantity-field">
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

              <label className="unit-field">
                Quantidade
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

              <label>
                Unidade
                <select
                  name="unidadeMedida"
                  value={formulario.unidadeMedida}
                  onChange={atualizarCampo}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="un">un</option>
                  <option value="L">L</option>
                </select>
              </label>

              <label className="stock-destination-field">
                Destino
                <select
                  name="tipoEstoque"
                  value={formulario.tipoEstoque}
                  onChange={atualizarCampo}
                >
                  <option value="principal">Estoque Principal</option>
                  <option value="pequeno">Estoque Pequeno</option>
                </select>
                <span className="form-hint">
                  Ao repetir um codigo, a quantidade soma no destino escolhido.
                </span>
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
                disabled={produtosPrincipal.length === 0}
              >
                Abastecer baldes
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={abrirFichaEstoque}
                disabled={produtosPrincipal.length === 0}
              >
                Estoque Principal
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={abrirEstoquePequeno}
                disabled={produtosPequeno.length === 0}
              >
                Estoque Pequeno
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
                      <small>Quantidade</small>
                      <strong className="stock-quantity">
                        {produto.quantidadeKg ?? 0} {obterUnidadeProduto(produto)}
                      </strong>
                    </span>
                    <span>
                      <small>Unidade</small>
                      {obterUnidadeProduto(produto)}
                    </span>
                  </div>

                  {usuarioAdmin && (
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
                  )}
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

                <h2>Movimentacao confirmada</h2>
                <p>
                  {quantidadeRetiradaNumero} {obterUnidadeProduto(produtoEmUso)}{" "}
                  de {produtoEmUso.nome}{" "}
                  {tipoDeUso === "abastecer-pequeno"
                    ? "foram enviados para o Estoque Pequeno."
                    : "foram retirados diretamente do Estoque Principal."}
                </p>
              </div>
            ) : (
              <>
                <div className="usage-header">
                  <div>
                    <span>Etapa {etapaUso} de 3</span>
                    <h2>Abastecer baldes</h2>
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
                    <h3>Qual material vai sair do pavilhao?</h3>
                    <p className="usage-helper">
                      Escolha um item do Estoque Principal. O caminho normal e
                      enviar material para os baldes do Estoque Pequeno.
                    </p>

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
                          <span>
                            Estoque: {produto.quantidadeKg ?? 0}{" "}
                            {obterUnidadeProduto(produto)}
                          </span>
                        </button>
                      ))}
                    </div>

                    {produtosFiltradosParaUso.length === 0 && (
                      <p className="usage-empty">
                        Nenhum produto do Estoque Principal encontrado.
                      </p>
                    )}
                  </div>
                )}

                {etapaUso === 2 && (
                  <div className="usage-step">
                    <h3>O que vai acontecer com esse material?</h3>

                    <div className="selected-product compact">
                      <strong>{produtoEmUso.nome}</strong>
                      <span>
                        Estoque atual: {produtoEmUso.quantidadeKg ?? 0}{" "}
                        {obterUnidadeProduto(produtoEmUso)}
                      </span>
                    </div>

                    <div className="usage-options">
                      {opcoesMovimentacaoPrincipal.map((opcao) => (
                        <label
                          className={
                            tipoDeUso === opcao.valor
                              ? "usage-option selected"
                              : "usage-option"
                          }
                          key={opcao.valor}
                        >
                          <input
                            type="radio"
                            name="tipoDeUso"
                            value={opcao.valor}
                            checked={tipoDeUso === opcao.valor}
                            onChange={(event) => setTipoDeUso(event.target.value)}
                          />
                          <span>
                            <strong>{opcao.titulo}</strong>
                            <small>{opcao.descricao}</small>
                          </span>
                        </label>
                      ))}
                    </div>

                    <label className="kg-field">
                      Quantidade a movimentar ({obterUnidadeProduto(produtoEmUso)})
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
                        <strong>Acao:</strong>{" "}
                        {movimentacaoPrincipalSelecionada?.titulo || "Nao informada"}
                      </p>
                      {tipoDeUso === "abastecer-pequeno" && (
                        <p>
                          <strong>Destino:</strong> Estoque Pequeno
                        </p>
                      )}
                      {tipoDeUso === "retirada-emergencial" && (
                        <p className="review-warning">
                          Essa opcao pula os baldes e retira direto do Estoque
                          Principal.
                        </p>
                      )}
                      <p>
                        <strong>Quantidade:</strong> {kgRetirado}{" "}
                        {obterUnidadeProduto(produtoEmUso)}
                      </p>
                    </div>

                    <div className="review-card calculation-card">
                      <p>
                        <strong>Movimentacao confirmada:</strong>{" "}
                        {quantidadeRetiradaNumero}{" "}
                        {obterUnidadeProduto(produtoEmUso)}
                      </p>
                      <p>
                        <strong>Estoque Principal apos movimentacao:</strong>{" "}
                        {Number(produtoEmUso.quantidadeKg || 0) -
                          quantidadeRetiradaNumero}{" "}
                        {obterUnidadeProduto(produtoEmUso)}
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

      {modalHistoricoAberto && (
        <div className="usage-overlay">
          <section className="usage-modal history-modal">
            <div className="usage-header">
              <div>
                <span>{movimentacoes.length} registro(s)</span>
                <h2>Movimentacoes</h2>
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
                      <span>Tipo: {movimentacao.tipo || "Nao informado"}</span>
                      {movimentacao.quantidadeKg && (
                        <span>
                          Quantidade: {movimentacao.quantidadeKg}{" "}
                          {obterUnidadeProduto(movimentacao.produto)}
                        </span>
                      )}
                      {movimentacao.origem && (
                        <span>Origem: {movimentacao.origem}</span>
                      )}
                      {movimentacao.destino && (
                        <span>Destino: {movimentacao.destino}</span>
                      )}
                      <span>Data: {formatarData(movimentacao.criadoEm)}</span>
                      <span>Usuario: {movimentacao.usuario || "Sistema"}</span>
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
                <h2>Produtos cadastrados</h2>
              </div>

              <button
                type="button"
                className="close-modal"
                onClick={fecharTodosProdutos}
                aria-label="Fechar"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-filter-bar">
              <div className="search-input-wrap">
                <Search size={18} />
                <input
                  type="text"
                  className="usage-search"
                  placeholder="Buscar por nome ou codigo..."
                  value={buscaTodosProdutos}
                  onChange={(event) => {
                    setBuscaTodosProdutos(event.target.value);
                    setPaginaTodosProdutos(1);
                  }}
                />
              </div>

              <button
                type="button"
                className="filter-icon-button"
                aria-label="Filtro"
                title="Filtro por nome ou codigo"
              >
                <Filter size={18} />
              </button>
            </div>

            <div className="registered-items-table">
              <div className="registered-items-head" aria-hidden="true">
                <span>Produto</span>
                <span>Codigo</span>
                <span>Fornecedor</span>
                <span>Quantidade</span>
                <span>Acoes</span>
              </div>

              <div className="registered-items-list">
              {produtosPaginadosTodos.map((produto) => (
                <article className="registered-item-row" key={produto.id}>
                  <div className="registered-item-main">
                    <h3>{produto.nome}</h3>
                    <p>{produto.descricao}</p>
                  </div>

                  <div className="registered-item-code">
                    <small>Codigo</small>
                    <strong title={produto.codigo}>{produto.codigo}</strong>
                  </div>

                  <div className="registered-item-supplier">
                    <small>Fornecedor</small>
                    <strong title={produto.fornecedor}>{produto.fornecedor}</strong>
                  </div>

                  <div className="registered-item-meta">
                    <span className="stock-value">
                      <small>Quantidade</small>
                      <strong className="stock-quantity">
                        {produto.quantidadeKg ?? 0} {obterUnidadeProduto(produto)}
                      </strong>
                    </span>
                  </div>

                  <div className="registered-item-actions">
                    {usuarioAdmin ? (
                      <>
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
                      </>
                    ) : (
                      <span className="read-only-note compact">Consulta</span>
                    )}
                  </div>
                </article>
              ))}
              </div>
            </div>

            {produtosFiltradosTodos.length === 0 && (
              <p className="usage-empty">Nenhum item cadastrado encontrado.</p>
            )}

            {produtosFiltradosTodos.length > itensPorPaginaProdutos && (
              <div className="modal-pagination">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() =>
                    setPaginaTodosProdutos((pagina) => Math.max(1, pagina - 1))
                  }
                  disabled={paginaAtualTodosProdutos === 1}
                  aria-label="Pagina anterior"
                  title="Pagina anterior"
                >
                  <ChevronLeft size={22} />
                </button>

                <span>
                  {paginaAtualTodosProdutos} de {totalPaginasTodosProdutos}
                </span>

                <button
                  type="button"
                  className="icon-button"
                  onClick={() =>
                    setPaginaTodosProdutos((pagina) =>
                      Math.min(totalPaginasTodosProdutos, pagina + 1),
                    )
                  }
                  disabled={paginaAtualTodosProdutos === totalPaginasTodosProdutos}
                  aria-label="Proxima pagina"
                  title="Proxima pagina"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {modalFichaAberto && (
        <div className="usage-overlay">
          <section className="usage-modal">
            <div className="usage-header">
              <div>
                <span>Resumo geral</span>
                <h2>Estoque Principal</h2>
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
                const statusEstoque = obterStatusEstoque(produto.quantidadeKg, obterConfiguracoesEstoqueProduto(produto));
                const saldoParaDevolver = calcularSaldoParaDevolver(produto);

                return (
                  <article className="stock-sheet-item" key={produto.id}>
                    <div>
                      <strong>{produto.nome}</strong>
                      <span>Codigo: {produto.codigo}</span>
                      <span>Fornecedor: {produto.fornecedor}</span>
                      <span>Descricao: {produto.descricao}</span>
                    </div>

                    <div>
                      <strong className="stock-quantity">
                        {produto.quantidadeKg ?? 0} {obterUnidadeProduto(produto)}
                      </strong>
                      <span>Unidade: {obterUnidadeProduto(produto)}</span>
                      <span className={`stock-pill ${statusEstoque.classe}`}>
                        {statusEstoque.texto}
                      </span>
                    </div>

                    <p>{statusEstoque.descricao}</p>

                    {saldoParaDevolver > 0 && (
                      <div className="stock-return">
                        <label>
                          Devolver sobra de retirada emergencial
                          <span>
                            Pendente: {saldoParaDevolver}{" "}
                            {obterUnidadeProduto(produto)}
                          </span>
                          <input
                            type="number"
                            min="0"
                            max={saldoParaDevolver}
                            step="0.01"
                            placeholder="Ex: 4"
                            value={devolucoesFicha[produto.id] || ""}
                            onChange={(event) =>
                              atualizarDevolucaoFicha(
                                produto.id,
                                event.target.value,
                              )
                            }
                          />
                        </label>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => devolverKgProduto(produto)}
                        >
                          Devolver ao Principal
                        </button>
                      </div>
                    )}
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

      {modalEstoquePequenoAberto && (
        <div className="usage-overlay">
          <section className="usage-modal">
            <div className="usage-header">
              <div>
                <span>Pequenas quantidades</span>
                <h2>Estoque Pequeno</h2>
              </div>

              <button
                type="button"
                className="close-modal"
                onClick={fecharEstoquePequeno}
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <input
              type="text"
              className="usage-search"
              placeholder="Filtrar por nome ou codigo..."
              value={buscaEstoquePequeno}
              onChange={(event) => setBuscaEstoquePequeno(event.target.value)}
            />

            {erroEstoquePequeno && <p className="form-error">{erroEstoquePequeno}</p>}

            <div className="stock-sheet">
              {produtosFiltradosEstoquePequeno.map((produto) => {
                const statusEstoque = obterStatusEstoque(produto.quantidadeKg, obterConfiguracoesEstoqueProduto(produto));
                const quantidadeDisponivel = Number(produto.quantidadeKg || 0);

                return (
                  <article className="stock-sheet-item small-stock" key={produto.id}>
                    <div>
                      <strong>{produto.nome}</strong>
                      <span>Codigo: {produto.codigo}</span>
                      <span>Fornecedor: {produto.fornecedor}</span>
                      <span>Descricao: {produto.descricao}</span>
                    </div>

                    <div>
                      <strong className="stock-quantity">
                        {produto.quantidadeKg ?? 0} {obterUnidadeProduto(produto)}
                      </strong>
                      <span>Unidade: {obterUnidadeProduto(produto)}</span>
                      <span className={`stock-pill ${statusEstoque.classe}`}>
                        {statusEstoque.texto}
                      </span>
                    </div>

                    <div className="stock-return small-stock-usage">
                      <label>
                        Quantidade utilizada em aula
                        <span>
                          Disponivel no balde: {produto.quantidadeKg ?? 0}{" "}
                          {obterUnidadeProduto(produto)}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={quantidadeDisponivel}
                          step="0.01"
                          placeholder="Ex: 2"
                          value={usosEstoquePequeno[produto.id] || ""}
                          onChange={(event) =>
                            atualizarUsoEstoquePequeno(
                              produto.id,
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => registrarUsoEstoquePequeno(produto)}
                        disabled={quantidadeDisponivel <= 0}
                      >
                        Registrar uso
                      </button>
                    </div>

                    <div className="stock-return small-stock-return">
                      <label>
                        Quantidade de sobra para devolver
                        <span>
                          Escolha se a sobra fica no balde ou volta ao pavilhao.
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={quantidadeDisponivel}
                          step="0.01"
                          placeholder="Ex: 1.5"
                          value={devolucoesEstoquePequeno[produto.id] || ""}
                          onChange={(event) =>
                            atualizarDevolucaoEstoquePequeno(
                              produto.id,
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label>
                        Destino da sobra
                        <span>Principal altera os dois estoques.</span>
                        <select
                          value={
                            destinosDevolucaoEstoquePequeno[produto.id] ||
                            estoquePrincipal
                          }
                          onChange={(event) =>
                            atualizarDestinoDevolucaoEstoquePequeno(
                              produto.id,
                              event.target.value,
                            )
                          }
                        >
                          <option value={estoquePrincipal}>Estoque Principal</option>
                          <option value={estoquePequeno}>Estoque Pequeno</option>
                        </select>
                      </label>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => devolverSobraEstoquePequeno(produto)}
                        disabled={quantidadeDisponivel <= 0}
                      >
                        Devolver sobra
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {produtosFiltradosEstoquePequeno.length === 0 && (
              <p className="usage-empty">Nenhum produto encontrado.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;



