// Registro de campos: tudo que aparece em um produto e uma definicao editavel.
// Os campos de sistema ja nascem no registro, mas nao podem ser excluidos nem
// trocar de tipo, porque o calculo de estoque depende deles.

export const CONTEXTOS = {
  estoque: {
    id: "estoque",
    titulo: "Estoque",
    descricao: "Campos do cadastro de materiais do pavilhao e dos baldes.",
  },
  catalogo: {
    id: "catalogo",
    titulo: "Catalogo",
    descricao: "Campos dos produtos que podem ser feitos em aula.",
  },
};

export const TIPOS_CAMPO = [
  { id: "texto", titulo: "Texto curto" },
  { id: "textoLongo", titulo: "Texto longo" },
  { id: "numero", titulo: "Numero" },
  { id: "selecao", titulo: "Lista de opcoes" },
  { id: "data", titulo: "Data" },
  { id: "simNao", titulo: "Sim ou nao" },
];

export const TIPOS_VALIDOS = TIPOS_CAMPO.map((tipo) => tipo.id);

// Campos que o sistema usa para calcular saldo e identificar o produto.
// Nao podem ser excluidos nem escondidos do aluno.
const ESSENCIAIS_ESTOQUE = ["nome", "codigo", "quantidadeKg"];

export const CAMPOS_SISTEMA = [
  // --- Estoque ---
  { chave: "nome", contexto: "estoque", rotulo: "Nome", tipo: "texto", ordem: 0 },
  { chave: "codigo", contexto: "estoque", rotulo: "Codigo", tipo: "texto", ordem: 1 },
  {
    chave: "fornecedor",
    contexto: "estoque",
    rotulo: "Fornecedor",
    tipo: "texto",
    ordem: 2,
  },
  {
    chave: "quantidadeKg",
    contexto: "estoque",
    rotulo: "Quantidade",
    tipo: "numero",
    ordem: 3,
  },
  {
    chave: "descricao",
    contexto: "estoque",
    rotulo: "Descricao",
    tipo: "textoLongo",
    ordem: 4,
  },
  // --- Catalogo ---
  { chave: "nome", contexto: "catalogo", rotulo: "Nome", tipo: "texto", ordem: 0 },
  {
    chave: "descricao",
    contexto: "catalogo",
    rotulo: "Descricao",
    tipo: "textoLongo",
    ordem: 1,
  },
  { chave: "foto", contexto: "catalogo", rotulo: "Foto", tipo: "texto", ordem: 2 },
].map((campo) => ({
  ...campo,
  id: `sistema:${campo.contexto}:${campo.chave}`,
  sistema: true,
  ativo: true,
  obrigatorio: campo.contexto === "estoque" && ESSENCIAIS_ESTOQUE.includes(campo.chave),
  visivelParaAluno: true,
  // Essencial nao pode sumir da tela do aluno: ele precisa saber o que e o
  // item e quanto tem.
  visibilidadeTravada:
    campo.contexto === "estoque" && ESSENCIAIS_ESTOQUE.includes(campo.chave),
}));

export function ehCampoDeSistema(campo) {
  return campo?.sistema === true;
}

export function campoEhVisivelPara(campo, ehAdmin) {
  if (campo?.ativo === false) return false;
  return ehAdmin || campo?.visivelParaAluno !== false;
}

// Junta o registro salvo no banco com os campos de sistema, para o admin ver
// uma lista so. O que estiver salvo vence, para preservar rotulo e ordem.
export function mesclarCampos(salvos = [], contexto) {
  const doContexto = (campo) => campo.contexto === contexto;
  const porId = new Map(salvos.filter(doContexto).map((campo) => [campo.id, campo]));

  const sistema = CAMPOS_SISTEMA.filter(doContexto).map((base) => ({
    ...base,
    ...(porId.get(base.id) || {}),
    sistema: true,
    chave: base.chave,
    tipo: base.tipo,
    visibilidadeTravada: base.visibilidadeTravada,
    obrigatorio: base.obrigatorio || porId.get(base.id)?.obrigatorio === true,
  }));

  const personalizados = salvos.filter(
    (campo) => doContexto(campo) && !campo.sistema && !campo.id.startsWith("sistema:"),
  );

  return [...sistema, ...personalizados].sort(
    (a, b) => Number(a.ordem ?? 99) - Number(b.ordem ?? 99),
  );
}

export function valorVazio(campo) {
  if (campo.tipo === "simNao") return false;
  if (campo.tipo === "numero") return "";
  return "";
}

export function formatarValorCampo(campo, valor) {
  if (valor === undefined || valor === null || valor === "") return "";
  if (campo.tipo === "simNao") return valor ? "Sim" : "Nao";
  if (campo.tipo === "data") {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleDateString("pt-BR");
  }
  return String(valor);
}
