// Dono do sistema: conta raiz, imutavel. Nao pode ser removida, desativada
// nem ter o papel alterado por ninguem (nem por outro super admin).
export const OWNER_EMAIL = "epaim787@gmail.com";

export const OWNER_ROLE = "owner";

export const OWNER_PROTECTED_MESSAGE =
  "Este usuario e o Owner do sistema e nao pode ser removido, desativado ou alterado.";

// Verificacao de backup automatico a cada 10 minutos enquanto o painel esta aberto.
export const AUTO_BACKUP_INTERVAL = 10 * 60 * 1000;

export const AUTO_BACKUP_HOUR = 3;

export const AUTO_BACKUP_TIME_ZONE = "America/Sao_Paulo";

export const AUTO_BACKUP_DAYS = [1, 15];

export const AUTO_BACKUP_WINDOW_MINUTES = 60;

export const AUTOMATIC_BACKUP_DAILY_RETENTION = 7;

export const AUTOMATIC_BACKUP_MONTHLY_RETENTION = 12;

// Se os dados caem para menos da metade do ultimo backup valido, o sistema
// entra em modo de protecao e suspende novos backups.
export const PROTECTION_THRESHOLD = 0.5;

export const CRITICAL_BACKUP_REDUCTION_RATIO = PROTECTION_THRESHOLD;

export const PROTECTION_OVERRIDE_DURATION = 10 * 60 * 1000;

export function isOwner(perfil) {
  return perfil?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

export function isPrivilegedAdmin(perfil) {
  return (
    perfil?.active !== false &&
    (perfil?.role === "superadmin" || isOwner(perfil))
  );
}

export function hasAdminAccess(perfil) {
  return (
    perfil?.active !== false &&
    !perfil?.adminAccessRevoked &&
    (isOwner(perfil) || ["admin", "superadmin", OWNER_ROLE].includes(perfil?.role))
  );
}

// Permissoes granulares. Owner e Super Admin tem todas por definicao; o
// professor comum recebe apenas o que for marcado no painel de Equipe.
export const PERMISSOES = [
  {
    grupo: "Estoque",
    itens: [
      { chave: "produtos.criar", titulo: "Cadastrar produtos", padrao: true },
      { chave: "produtos.editar", titulo: "Editar produtos", padrao: true },
      { chave: "produtos.excluir", titulo: "Excluir produtos", padrao: false },
      { chave: "estoque.movimentar", titulo: "Registrar uso e retirada", padrao: true },
      { chave: "estoque.devolver", titulo: "Devolver material", padrao: true },
    ],
  },
  {
    grupo: "Aulas",
    itens: [
      { chave: "justificativas.responder", titulo: "Responder justificativas", padrao: true },
      { chave: "links.gerar", titulo: "Gerar links de acesso", padrao: false },
    ],
  },
  {
    grupo: "Sistema",
    itens: [
      { chave: "auditoria.ver", titulo: "Ver a auditoria", padrao: false },
      { chave: "relatorios.exportar", titulo: "Exportar relatorios", padrao: false },
      { chave: "configuracoes.editar", titulo: "Alterar configuracoes", padrao: false },
    ],
  },
];

export const CHAVES_PERMISSAO = PERMISSOES.flatMap((grupo) =>
  grupo.itens.map((item) => item.chave),
);

export function permissoesPadrao() {
  return Object.fromEntries(
    PERMISSOES.flatMap((grupo) => grupo.itens).map((item) => [item.chave, item.padrao]),
  );
}

// Super Admin e Owner passam por cima da lista: mexem em tudo.
export function podeFazer(perfil, chave) {
  if (!hasAdminAccess(perfil)) return false;
  if (isPrivilegedAdmin(perfil)) return true;
  return perfil?.permissoes?.[chave] === true;
}

export function contarPermissoes(perfil) {
  if (isPrivilegedAdmin(perfil)) return CHAVES_PERMISSAO.length;
  return CHAVES_PERMISSAO.filter((chave) => perfil?.permissoes?.[chave] === true).length;
}

export function nomePerfil(perfil) {
  return perfil?.nome || perfil?.name || perfil?.email || "Sistema";
}

export function rotuloPapel(perfil) {
  if (isOwner(perfil)) return "Owner";
  if (perfil?.role === "superadmin") return "Super Admin";
  if (perfil?.role === "admin") return "Professor";
  return "Publico";
}
