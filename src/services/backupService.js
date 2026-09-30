import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  AUTOMATIC_BACKUP_DAILY_RETENTION,
  AUTOMATIC_BACKUP_MONTHLY_RETENTION,
  CRITICAL_BACKUP_REDUCTION_RATIO,
  PROTECTION_OVERRIDE_DURATION,
  isOwner,
  isPrivilegedAdmin,
  nomePerfil,
} from "../config/security";
import { obterCicloBackupAutomatico } from "../lib/backupSchedule";
import { db, requireFirebase } from "../firebaseconfig";
import { criarLogAuditoria } from "./auditService";
import { withTimeout } from "./timeout";

// Colecoes incluidas no snapshot. A colecao "backups" fica de fora de proposito,
// para um backup nunca conter os outros backups.
const COLECOES = [
  "produtos",
  "produtosFinais",
  "configuracoes",
  "linksAcesso",
  "historicoMovimentacoes",
  "justificativas",
  "admins",
  "logs",
];

const COLECAO_BACKUPS = "backups";
const DOC_PROTECAO = "backup";
const COLECAO_PROTECAO = "systemProtection";
// Limite do Firestore por lote e 500 operacoes; deixamos folga.
const TAMANHO_LOTE = 400;

export function podeRestaurarBackups(perfil) {
  return isOwner(perfil);
}

export function podeCriarBackups(perfil) {
  return isPrivilegedAdmin(perfil);
}

function protecaoRef() {
  requireFirebase();
  return doc(db, COLECAO_PROTECAO, DOC_PROTECAO);
}

async function lerColecao(nome) {
  const snapshot = await getDocs(collection(db, nome));
  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
}

async function lerTodasColecoes() {
  const dados = {};
  await Promise.all(
    COLECOES.map(async (nome) => {
      dados[nome] = await lerColecao(nome);
    }),
  );
  return dados;
}

function contar(lista) {
  return Array.isArray(lista) ? lista.length : 0;
}

function montarContagens(dados = {}) {
  return {
    produtos: contar(dados.produtos),
    produtosFinais: contar(dados.produtosFinais),
    linksAcesso: contar(dados.linksAcesso),
    movimentacoes: contar(dados.historicoMovimentacoes),
    justificativas: contar(dados.justificativas),
    usuarios: contar(dados.admins),
    logs: contar(dados.logs),
  };
}

function chavesComparaveis(contagens = {}) {
  return Object.keys(contagens).filter((chave) => Number(contagens[chave] || 0) > 0);
}

function chaveDiaBackup(backup) {
  if (backup.dayKey) return backup.dayKey;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(backup.createdAt || Date.now()));
}

function chaveMesBackup(backup) {
  if (backup.monthKey) return backup.monthKey;
  return chaveDiaBackup(backup).slice(0, 7);
}

// A listagem nao traz o campo "data" (pesado): ele so e lido sob demanda.
function resumoBackup(id, dados) {
  const { data: _conteudo, ...resumo } = dados;
  return { id, ...resumo };
}

export function acompanharBackups(callback, tratarErro) {
  if (!db) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, COLECAO_BACKUPS),
    (snapshot) => {
      const backups = snapshot.docs
        .map((documento) => resumoBackup(documento.id, documento.data()))
        .filter((backup) => backup.hiddenFromList !== true)
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

      callback(backups);
    },
    (error) => {
      if (tratarErro) tratarErro(error);
    },
  );
}

export function acompanharProtecaoBackup(callback, tratarErro) {
  if (!db) {
    callback({ active: false });
    return () => {};
  }

  return onSnapshot(
    protecaoRef(),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : { active: false }),
    (error) => {
      if (tratarErro) tratarErro(error);
    },
  );
}

async function listarBackups() {
  const snapshot = await getDocs(collection(db, COLECAO_BACKUPS));
  return snapshot.docs
    .map((documento) => resumoBackup(documento.id, documento.data()))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

export async function carregarBackupCompleto(id) {
  requireFirebase();
  const snapshot = await getDoc(doc(db, COLECAO_BACKUPS, id));
  if (!snapshot.exists()) {
    throw new Error("Backup nao encontrado.");
  }
  return { id, ...snapshot.data() };
}

async function ultimoBackupValido() {
  const backups = await listarBackups();
  return backups.find(
    (backup) =>
      backup.type !== "pre_restore" &&
      backup.valid !== false &&
      Number(backup.counts?.produtos || 0) > 0,
  );
}

async function registrarEventoBackup(perfil, payload) {
  // Backup e restauracao nao podem falhar por causa da auditoria.
  await criarLogAuditoria(perfil, payload).catch(() => {});
}

// Compara o estado atual com o ultimo backup valido. Se alguma colecao caiu
// abaixo de metade do que tinha, o sistema entra em modo de protecao.
export async function verificarIntegridade(perfil = null) {
  requireFirebase();

  const dados = await lerTodasColecoes();
  const contagensAtuais = montarContagens(dados);
  const ultimoValido = await ultimoBackupValido();
  const contagensAnteriores = ultimoValido?.counts || {};

  const snapshotProtecao = await getDoc(protecaoRef());
  const protecao = snapshotProtecao.exists()
    ? snapshotProtecao.data()
    : { active: false };
  const overrideAtivo = Number(protecao.overrideUntil || 0) > Date.now();

  const motivos = chavesComparaveis(contagensAnteriores)
    .map((chave) => ({
      key: chave,
      current: Number(contagensAtuais[chave] || 0),
      last: Number(contagensAnteriores[chave] || 0),
      threshold: Math.floor(
        Number(contagensAnteriores[chave] || 0) * CRITICAL_BACKUP_REDUCTION_RATIO,
      ),
    }))
    .filter((motivo) => motivo.current < motivo.threshold);

  const suspeito = motivos.length > 0;

  if (suspeito && !overrideAtivo && !protecao.active) {
    const novaProtecao = {
      active: true,
      enteredAt: Date.now(),
      lastValidBackupId: ultimoValido?.id || "",
      lastValidBackupAt: ultimoValido?.createdAt || null,
      reasons: motivos,
      currentCounts: contagensAtuais,
      lastCounts: contagensAnteriores,
    };

    await setDoc(protecaoRef(), novaProtecao);
    await registrarEventoBackup(perfil, {
      action: "BACKUP_PROTECTION_ON",
      entity: "backup",
      entityId: ultimoValido?.id || null,
      description:
        "Reducao critica de dados detectada. O sistema entrou em modo de protecao e os backups automaticos foram suspensos para preservar o ultimo backup valido.",
      after: novaProtecao,
    });

    return {
      status: "protected",
      healthy: false,
      currentCounts: contagensAtuais,
      lastCounts: contagensAnteriores,
      reasons: motivos,
      protection: novaProtecao,
      lastValidBackup: ultimoValido,
    };
  }

  if (!suspeito && protecao.active) {
    const novaProtecao = {
      ...protecao,
      active: false,
      exitedAt: Date.now(),
      reasons: [],
      currentCounts: contagensAtuais,
    };

    await setDoc(protecaoRef(), novaProtecao);
    await registrarEventoBackup(perfil, {
      action: "BACKUP_PROTECTION_OFF",
      entity: "backup",
      description:
        "Sistema voltou ao estado normal. Os backups automaticos foram reativados.",
      after: novaProtecao,
    });

    return {
      status: "healthy",
      healthy: true,
      currentCounts: contagensAtuais,
      lastCounts: contagensAnteriores,
      reasons: [],
      protection: novaProtecao,
      lastValidBackup: ultimoValido,
    };
  }

  const status = suspeito && !overrideAtivo
    ? "protected"
    : overrideAtivo
      ? "warning"
      : "healthy";

  return {
    status,
    healthy: !suspeito || overrideAtivo,
    currentCounts: contagensAtuais,
    lastCounts: contagensAnteriores,
    reasons: motivos,
    protection: protecao,
    lastValidBackup: ultimoValido,
  };
}

export async function ignorarProtecaoBackup(perfil) {
  requireFirebase();

  if (!isOwner(perfil)) {
    await registrarEventoBackup(perfil, {
      action: "PERMISSION_DENIED",
      entity: "backup",
      description: "Tentativa de ignorar a protecao de backup por usuario sem permissao.",
    });
    throw new Error("Somente o Owner pode ignorar a protecao de backup.");
  }

  const snapshot = await getDoc(protecaoRef());
  const atual = snapshot.exists() ? snapshot.data() : {};
  const novaProtecao = {
    ...atual,
    active: false,
    overrideUntil: Date.now() + PROTECTION_OVERRIDE_DURATION,
    overrideBy: perfil?.uid || "",
    overrideByName: nomePerfil(perfil),
    overrideAt: Date.now(),
  };

  await setDoc(protecaoRef(), novaProtecao);
  await registrarEventoBackup(perfil, {
    action: "BACKUP_PROTECTION_OVERRIDE",
    entity: "backup",
    description: "Owner ignorou temporariamente a protecao de backup.",
    after: novaProtecao,
  });

  return novaProtecao;
}

export async function criarBackup(perfil, tipo = "manual", opcoes = {}) {
  requireFirebase();

  const integridade = opcoes.pularIntegridade
    ? { status: "healthy", currentCounts: {}, lastCounts: {}, reasons: [], protection: {} }
    : await verificarIntegridade(perfil);
  const bloqueado = integridade.status === "protected";

  if (bloqueado && tipo === "automatic") {
    return null;
  }

  if (bloqueado && tipo === "manual" && !isOwner(perfil)) {
    const erro = new Error(
      "O sistema detectou uma reducao critica de dados. Para proteger os ultimos backups validos, a criacao de novos backups foi temporariamente bloqueada. Somente o Owner pode ignorar esta protecao.",
    );
    erro.code = "backup/protected";
    erro.integrity = integridade;
    throw erro;
  }

  if (bloqueado && tipo === "manual" && isOwner(perfil) && !opcoes.confirmarSuspeito) {
    const erro = new Error(
      "O sistema esta em modo de protecao. Confirme a opcao de ignorar a protecao antes de criar o backup.",
    );
    erro.code = "backup/protected-owner";
    erro.integrity = integridade;
    throw erro;
  }

  const dados = await lerTodasColecoes();
  const contagens = montarContagens(dados);
  const automatico = tipo === "automatic";

  const backup = {
    createdAt: opcoes.createdAt || Date.now(),
    createdBy: automatico ? "system" : perfil?.uid || "",
    createdByName: automatico ? "Storage SENAI" : nomePerfil(perfil),
    version: "1.0.0",
    type: tipo,
    valid: true,
    label: opcoes.label || "",
    description: opcoes.description || "",
    hiddenFromList: opcoes.hiddenFromList === true,
    collections: COLECOES,
    counts: contagens,
    data: dados,
    ...(opcoes.ciclo || {}),
  };

  const referencia = await withTimeout(
    addDoc(collection(db, COLECAO_BACKUPS), backup),
    "Nao foi possivel criar o backup.",
    20000,
  );

  if (opcoes.pularAuditoria !== true) {
    await registrarEventoBackup(perfil, {
      action: "BACKUP",
      entity: "backup",
      entityId: referencia.id,
      description:
        opcoes.logDescription ||
        (tipo === "pre_restore"
          ? "Backup de seguranca criado antes da restauracao."
          : automatico
            ? "Backup automatico criado pelo sistema."
            : "Backup manual criado com sucesso."),
      after: contagens,
    });
  }

  return { id: referencia.id, ...backup };
}

// Retencao: mantem os 7 dias mais recentes e 1 backup por mes nos ultimos 12 meses.
async function rotacionarBackupsAutomaticos() {
  const backups = (await listarBackups()).filter(
    (backup) => backup.type === "automatic",
  );

  const manter = new Set();
  const diasMantidos = new Set();
  const mesesMantidos = new Set();

  backups.forEach((backup) => {
    const dia = chaveDiaBackup(backup);
    if (diasMantidos.size < AUTOMATIC_BACKUP_DAILY_RETENTION && !diasMantidos.has(dia)) {
      diasMantidos.add(dia);
      manter.add(backup.id);
    }
  });

  backups.forEach((backup) => {
    const mes = chaveMesBackup(backup);
    if (
      mesesMantidos.size < AUTOMATIC_BACKUP_MONTHLY_RETENTION &&
      !mesesMantidos.has(mes)
    ) {
      mesesMantidos.add(mes);
      manter.add(backup.id);
    }
  });

  await Promise.all(
    backups
      .filter((backup) => !manter.has(backup.id))
      .map((backup) => deleteDoc(doc(db, COLECAO_BACKUPS, backup.id))),
  );
}

export async function garantirBackupAutomatico(perfil) {
  if (!podeCriarBackups(perfil)) return null;

  const ciclo = obterCicloBackupAutomatico();
  if (!ciclo) return null;

  const backups = await listarBackups();
  const jaCriado = backups.some(
    (backup) => backup.type === "automatic" && backup.cycleKey === ciclo.cycleKey,
  );
  if (jaCriado) return null;

  const backup = await criarBackup(perfil, "automatic", {
    createdAt: ciclo.scheduledAt,
    ciclo,
  });
  if (!backup) return null;

  await rotacionarBackupsAutomaticos();
  return backup;
}

export function baixarBackupJson(backup) {
  const carimbo = new Date(backup.createdAt || Date.now())
    .toISOString()
    .slice(0, 16)
    .replace("T", "-")
    .replace(":", "-");

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `backup-storage-senai-${carimbo}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function aplicarEmLotes(operacoes) {
  for (let inicio = 0; inicio < operacoes.length; inicio += TAMANHO_LOTE) {
    const lote = writeBatch(db);
    operacoes.slice(inicio, inicio + TAMANHO_LOTE).forEach((aplicar) => aplicar(lote));
    await lote.commit();
  }
}

// Restauracao: apaga o que existe hoje em cada colecao do snapshot e reescreve
// os documentos do backup, preservando os mesmos IDs.
export async function restaurarBackup(perfil, backupResumo) {
  requireFirebase();

  if (!podeRestaurarBackups(perfil)) {
    await registrarEventoBackup(perfil, {
      action: "PERMISSION_DENIED",
      entity: "backup",
      entityId: backupResumo?.id || null,
      description: "Tentativa de restaurar backup por usuario sem permissao.",
    });
    throw new Error("Somente o Owner pode restaurar backups.");
  }

  const backup = await carregarBackupCompleto(backupResumo.id);

  await registrarEventoBackup(perfil, {
    action: "RESTORE",
    entity: "backup",
    entityId: backup.id,
    description: "Tentativa de restauracao iniciada.",
    before: backup.counts,
  });

  // Rede de seguranca: guarda o estado atual antes de sobrescrever.
  await criarBackup(perfil, "pre_restore", { pularIntegridade: true });

  const dados = backup.data || {};
  const colecoesParaRestaurar = (backup.collections || COLECOES).filter(
    (nome) => Array.isArray(dados[nome]),
  );

  for (const nome of colecoesParaRestaurar) {
    const atuais = await getDocs(collection(db, nome));
    const remocoes = atuais.docs.map(
      (documento) => (lote) => lote.delete(doc(db, nome, documento.id)),
    );
    const escritas = dados[nome].map((registro) => (lote) => {
      const { id, ...conteudo } = registro;
      lote.set(doc(db, nome, id), conteudo);
    });

    await aplicarEmLotes([...remocoes, ...escritas]);
  }

  await registrarEventoBackup(perfil, {
    action: "RESTORE",
    entity: "backup",
    entityId: backup.id,
    description:
      "Restauracao concluida. Um backup de seguranca foi criado antes da restauracao.",
    after: backup.counts,
  });

  await verificarIntegridade(perfil);
}
