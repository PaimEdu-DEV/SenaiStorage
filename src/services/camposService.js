import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { TIPOS_VALIDOS, ehCampoDeSistema } from "../config/campos";
import { db, requireFirebase } from "../firebaseconfig";
import { criarLogAuditoria } from "./auditService";
import { withTimeout } from "./timeout";

const COLECAO = "camposPersonalizados";

export function acompanharCampos(callback, tratarErro) {
  if (!db) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, COLECAO),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((documento) => ({ id: documento.id, ...documento.data() }))
          .sort((a, b) => Number(a.ordem ?? 99) - Number(b.ordem ?? 99)),
      );
    },
    (error) => {
      if (tratarErro) tratarErro(error);
    },
  );
}

function validar(campo) {
  if (!campo.rotulo?.trim()) {
    throw new Error("Informe o nome do campo.");
  }

  if (!TIPOS_VALIDOS.includes(campo.tipo)) {
    throw new Error("Tipo de campo invalido.");
  }

  if (campo.tipo === "selecao" && (campo.opcoes || []).length === 0) {
    throw new Error("Uma lista de opcoes precisa de pelo menos uma opcao.");
  }
}

// Gera um id estavel a partir do nome, para o valor gravado no produto nao
// se perder quando o campo for renomeado depois.
function gerarId(rotulo) {
  const base = rotulo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "campo"}-${Date.now().toString(36)}`;
}

export async function salvarCampo(campo, perfil, anterior = null) {
  requireFirebase();
  validar(campo);

  const novo = !anterior;
  const id = anterior?.id || gerarId(campo.rotulo);
  const agora = Date.now();

  // Campo de sistema so aceita rotulo, ordem, ajuda e visibilidade: tipo e
  // chave ficam como estao, porque o resto do sistema depende deles.
  const dados = ehCampoDeSistema(anterior)
    ? {
        id,
        contexto: anterior.contexto,
        chave: anterior.chave,
        tipo: anterior.tipo,
        sistema: true,
        rotulo: campo.rotulo.trim(),
        ajuda: campo.ajuda?.trim() || "",
        ordem: Number(campo.ordem ?? anterior.ordem ?? 0),
        visivelParaAluno: anterior.visibilidadeTravada
          ? true
          : campo.visivelParaAluno !== false,
        ativo: true,
        atualizadoEm: agora,
      }
    : {
        id,
        contexto: campo.contexto,
        chave: id,
        sistema: false,
        rotulo: campo.rotulo.trim(),
        tipo: campo.tipo,
        opcoes: campo.tipo === "selecao" ? campo.opcoes : [],
        ajuda: campo.ajuda?.trim() || "",
        obrigatorio: campo.obrigatorio === true,
        visivelParaAluno: campo.visivelParaAluno !== false,
        ordem: Number(campo.ordem ?? 99),
        ativo: campo.ativo !== false,
        criadoEm: anterior?.criadoEm || agora,
        criadoPor: anterior?.criadoPor || perfil?.uid || "",
        atualizadoEm: agora,
      };

  await withTimeout(
    setDoc(doc(db, COLECAO, id), dados),
    "Nao foi possivel salvar o campo.",
  );

  await criarLogAuditoria(perfil, {
    action: novo ? "FIELD_CREATE" : "FIELD_UPDATE",
    entity: "campo",
    entityId: id,
    description: novo
      ? `Campo '${dados.rotulo}' foi criado no ${dados.contexto}, ${dados.visivelParaAluno ? "visivel" : "oculto"} para o aluno.`
      : `Campo '${dados.rotulo}' foi atualizado no ${dados.contexto}.`,
    before: anterior,
    after: dados,
  }).catch(() => {});

  return dados;
}

export async function alternarVisibilidade(campo, perfil) {
  requireFirebase();

  if (campo.visibilidadeTravada) {
    throw new Error(
      "Este campo e essencial para o aluno entender o item e nao pode ser escondido.",
    );
  }

  const visivel = campo.visivelParaAluno === false;

  // Campo de sistema pode ainda nao ter documento proprio no banco.
  await setDoc(
    doc(db, COLECAO, campo.id),
    {
      ...campo,
      visivelParaAluno: visivel,
      atualizadoEm: Date.now(),
    },
    { merge: true },
  );

  await criarLogAuditoria(perfil, {
    action: "FIELD_UPDATE",
    entity: "campo",
    entityId: campo.id,
    description: `Campo '${campo.rotulo}' ficou ${visivel ? "visivel" : "oculto"} para o aluno.`,
  }).catch(() => {});
}

export async function reordenarCampos(campos, perfil) {
  requireFirebase();

  await Promise.all(
    campos.map((campo, indice) =>
      setDoc(
        doc(db, COLECAO, campo.id),
        { ...campo, ordem: indice, atualizadoEm: Date.now() },
        { merge: true },
      ),
    ),
  );

  await criarLogAuditoria(perfil, {
    action: "FIELD_UPDATE",
    entity: "campo",
    description: "Ordem dos campos foi alterada.",
  }).catch(() => {});
}

export async function excluirCampo(campo, perfil) {
  requireFirebase();

  if (ehCampoDeSistema(campo)) {
    throw new Error(
      "Campos do sistema nao podem ser excluidos. Voce pode renomea-los ou escondê-los do aluno.",
    );
  }

  await deleteDoc(doc(db, COLECAO, campo.id));
  await criarLogAuditoria(perfil, {
    action: "FIELD_DELETE",
    entity: "campo",
    entityId: campo.id,
    description: `Campo '${campo.rotulo}' foi excluido do ${campo.contexto}. Os valores ja gravados nos produtos deixam de aparecer.`,
    before: campo,
  }).catch(() => {});
}

export async function desativarCampo(campo, perfil) {
  requireFirebase();
  await updateDoc(doc(db, COLECAO, campo.id), {
    ativo: false,
    atualizadoEm: Date.now(),
  });
  await criarLogAuditoria(perfil, {
    action: "FIELD_UPDATE",
    entity: "campo",
    entityId: campo.id,
    description: `Campo '${campo.rotulo}' foi desativado.`,
  }).catch(() => {});
}
