const rotulosAcao = {
  CREATE: "Criacao",
  UPDATE: "Edicao",
  DELETE: "Exclusao",
  STOCK_IN: "Entrada de material",
  STOCK_OUT: "Retirada de material",
  STOCK_RETURN: "Devolucao de material",
  BACKUP: "Backup",
  BACKUP_PROTECTION_ON: "Protecao ativada",
  BACKUP_PROTECTION_OFF: "Protecao encerrada",
  BACKUP_PROTECTION_OVERRIDE: "Protecao ignorada",
  RESTORE: "Restauracao",
  EXPORT: "Exportacao",
  USER_CREATE: "Criacao de usuario",
  USER_DELETE: "Revogacao de usuario",
  USER_PROMOTE: "Promocao de usuario",
  USER_DEMOTE: "Rebaixamento de usuario",
  PERMISSION_UPDATE: "Alteracao de permissoes",
  PERMISSION_DENIED: "Acesso negado",
  CONFIG_UPDATE: "Alteracao de configuracao",
  LINK_CREATE: "Criacao de link de acesso",
  LINK_DELETE: "Exclusao de link de acesso",
  JUSTIFICATION: "Justificativa",
};

const rotulosEntidade = {
  produto: "Produto",
  produtos: "Produtos",
  user: "Usuario",
  users: "Usuarios",
  backup: "Backup",
  movimentacao: "Movimentacao",
  justificativa: "Justificativa",
  link: "Link de acesso",
  config: "Configuracao",
  relatorio: "Relatorio",
  system: "Sistema",
};

// Cada acao ganha a cor que ja existe no sistema para status de estoque.
const variantesAcao = {
  CREATE: "good",
  USER_CREATE: "good",
  STOCK_IN: "good",
  BACKUP_PROTECTION_OFF: "good",
  UPDATE: "info",
  USER_PROMOTE: "info",
  CONFIG_UPDATE: "info",
  BACKUP: "info",
  EXPORT: "info",
  PERMISSION_UPDATE: "info",
  LINK_CREATE: "info",
  STOCK_OUT: "attention",
  STOCK_RETURN: "attention",
  USER_DEMOTE: "attention",
  RESTORE: "attention",
  BACKUP_PROTECTION_ON: "attention",
  BACKUP_PROTECTION_OVERRIDE: "attention",
  JUSTIFICATION: "attention",
  DELETE: "low",
  USER_DELETE: "low",
  LINK_DELETE: "low",
  PERMISSION_DENIED: "low",
};

export const ACOES_AUDITAVEIS = Object.keys(rotulosAcao);

export const ENTIDADES_AUDITAVEIS = Object.keys(rotulosEntidade).filter(
  (entidade) => !entidade.endsWith("s") || entidade === "status",
);

export function formatarAcao(acao) {
  return rotulosAcao[acao] || acao || "Acao";
}

export function formatarEntidade(entidade) {
  return rotulosEntidade[entidade] || entidade || "Sistema";
}

export function varianteAcao(acao) {
  return variantesAcao[acao] || "";
}

export function formatarDataLog(timestamp) {
  if (!timestamp) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function rotuloProduto(log) {
  const origem = log?.before || log?.after || {};
  const nome = origem.nome || origem.codigo;
  if (!nome) return "";
  const codigo = origem.codigo && origem.codigo !== nome ? ` (${origem.codigo})` : "";
  return `${nome}${codigo}`;
}

export function formatarDescricaoLog(log) {
  const descricao = log?.description || "";
  if (descricao) return descricao;

  const produto = log?.entity === "produto" ? rotuloProduto(log) : "";
  if (!produto) return "-";

  if (log.action === "DELETE") return `Produto '${produto}' foi excluido.`;
  if (log.action === "UPDATE") return `Produto '${produto}' foi atualizado.`;
  if (log.action === "CREATE") return `Produto '${produto}' foi cadastrado.`;

  return produto;
}
