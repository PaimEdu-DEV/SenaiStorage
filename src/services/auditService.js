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
