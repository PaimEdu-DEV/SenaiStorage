import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db, requireFirebase } from "../firebaseconfig";
import { withTimeout } from "./timeout";

const COLECAO_LOGS = "logs";

export function montarAtor(perfil) {
  return {
    userId: perfil?.uid || "",
    userName: perfil?.nome || perfil?.name || "Sistema",
    userEmail: perfil?.email || "",
    userRole: perfil?.role || "public",
  };
}

export async function criarLogAuditoria(perfil, payload) {
  requireFirebase();
  const log = {
    ...montarAtor(perfil),
    action: payload.action,
    entity: payload.entity,
    entityId: payload.entityId || null,
    description: payload.description || "",
    before: payload.before ? JSON.parse(JSON.stringify(payload.before)) : null,
    after: payload.after ? JSON.parse(JSON.stringify(payload.after)) : null,
    createdAt: Date.now(),
  };

  const referencia = await withTimeout(
    addDoc(collection(db, COLECAO_LOGS), log),
    "Nao foi possivel registrar a auditoria.",
    8000,
  );

  return { id: referencia.id, ...log };
}

export function filtrarLogs(logs, filtros) {
  const busca = filtros.busca.trim().toLowerCase();
  const inicio = filtros.dataInicial
    ? new Date(`${filtros.dataInicial}T00:00:00`).getTime()
    : 0;
  const fim = filtros.dataFinal
    ? new Date(`${filtros.dataFinal}T23:59:59`).getTime()
    : Infinity;

  return logs.filter((log) => {
    const textoCompleto = [
      log.userName,
      log.userEmail,
      log.action,
      log.entity,
      log.description,
      log.entityId,
    ]
      .join(" ")
      .toLowerCase();

    const tempo = Number(log.createdAt || 0);

    return (
      (!busca || textoCompleto.includes(busca)) &&
      (filtros.acao === "Todos" || log.action === filtros.acao) &&
      (filtros.entidade === "Todos" || log.entity === filtros.entidade) &&
      (filtros.usuario === "Todos" ||
        log.userEmail === filtros.usuario ||
        log.userName === filtros.usuario) &&
      tempo >= inicio &&
      tempo <= fim
    );
  });
}

export function acompanharLogs(callback, tratarErro, maximo = 300) {
  if (!db) {
    callback([]);
    return () => {};
  }

  const consulta = query(
    collection(db, COLECAO_LOGS),
    orderBy("createdAt", "desc"),
    limit(maximo),
  );

  return onSnapshot(
    consulta,
    (snapshot) => {
      callback(snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() })));
    },
    (error) => {
      if (tratarErro) tratarErro(error);
    },
  );
}
