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

export function nomePerfil(perfil) {
  return perfil?.nome || perfil?.name || perfil?.email || "Sistema";
}

export function rotuloPapel(perfil) {
  if (isOwner(perfil)) return "Owner";
  if (perfil?.role === "superadmin") return "Super Admin";
  if (perfil?.role === "admin") return "Professor";
  return "Publico";
}
