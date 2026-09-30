import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebaseconfig";

function verificarFirebase() {
  if (!db) {
    throw new Error("Firebase ainda nao foi configurado.");
  }
}

function criarIdSimplesProduto(produto) {
  const textoBase = produto.nome || produto.codigo;
  const sufixoEstoque = produto.tipoEstoque === "pequeno" ? "-pequeno" : "";

  const idBase = textoBase
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${idBase}${sufixoEstoque}`;
}

export function cadastrarProduto(produto) {
  verificarFirebase();
  const produtoRef = doc(db, "produtos", criarIdSimplesProduto(produto));

  return setDoc(produtoRef, produto);
}

export function listarProdutos(callback, tratarErro) {
  if (!db) {
    callback([]);
    return () => {};
  }

  const produtosCollection = collection(db, "produtos");
  const consultaProdutos = query(produtosCollection, orderBy("nome"));

  return onSnapshot(
    consultaProdutos,
    (snapshot) => {
      const produtos = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      callback(produtos);
    },
    (error) => {
      if (tratarErro) {
        tratarErro(error);
      }
    },
  );
}

export function atualizarProduto(id, produto) {
  verificarFirebase();
  const produtoRef = doc(db, "produtos", id);

  return updateDoc(produtoRef, produto);
}

export function excluirProduto(id) {
  verificarFirebase();
  const produtoRef = doc(db, "produtos", id);

  return deleteDoc(produtoRef);
}

export function cadastrarProdutoFinal(produtoFinal) {
  verificarFirebase();
  const produtoFinalRef = doc(db, "produtosFinais", produtoFinal.id);

  return setDoc(produtoFinalRef, produtoFinal);
}

export function listarProdutosFinais(callback, tratarErro) {
  if (!db) {
    callback([]);
    return () => {};
  }

  const produtosFinaisCollection = collection(db, "produtosFinais");
  const consultaProdutosFinais = query(
    produtosFinaisCollection,
    orderBy("criadoEm", "desc"),
  );

  return onSnapshot(
    consultaProdutosFinais,
    (snapshot) => {
      const produtosFinais = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      callback(produtosFinais);
    },
    (error) => {
      if (tratarErro) {
        tratarErro(error);
      }
    },
  );
}

export function excluirProdutoFinal(id) {
  verificarFirebase();
  const produtoFinalRef = doc(db, "produtosFinais", id);

  return deleteDoc(produtoFinalRef);
}

export function salvarConfiguracoesSistema(configuracoes) {
  verificarFirebase();
  const configuracoesRef = doc(db, "configuracoes", "sistema");

  return setDoc(configuracoesRef, configuracoes, { merge: true });
}

export function listarConfiguracoesSistema(callback, tratarErro) {
  if (!db) {
    callback({});
    return () => {};
  }

  const configuracoesRef = doc(db, "configuracoes", "sistema");

  return onSnapshot(
    configuracoesRef,
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.data() : {});
    },
    (error) => {
      if (tratarErro) {
        tratarErro(error);
      }
    },
  );
}

export function cadastrarLinkAcesso(link) {
  verificarFirebase();
  const linkRef = doc(db, "linksAcesso", link.token);

  return setDoc(linkRef, link);
}

export function listarLinksAcesso(callback, tratarErro) {
  if (!db) {
    callback([]);
    return () => {};
  }

  const linksCollection = collection(db, "linksAcesso");
  const consultaLinks = query(linksCollection, orderBy("criadoEm", "desc"));

  return onSnapshot(
    consultaLinks,
    (snapshot) => {
      const links = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      callback(links);
    },
    (error) => {
      if (tratarErro) {
        tratarErro(error);
      }
    },
  );
}

export async function buscarLinkAcesso(token) {
  verificarFirebase();
  const linkRef = doc(db, "linksAcesso", token);
  const snapshot = await getDoc(linkRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export function excluirLinkAcesso(token) {
  verificarFirebase();
  const linkRef = doc(db, "linksAcesso", token);

  return deleteDoc(linkRef);
}

export function cadastrarMovimentacao(movimentacao) {
  verificarFirebase();
  const historicoRef = doc(collection(db, "historicoMovimentacoes"));
  const criadoEm = Date.now();

  return setDoc(historicoRef, {
    usuario: "Sistema",
    ...movimentacao,
    criadoEm,
    data: new Date(criadoEm).toISOString(),
  }).then(() => historicoRef.id);
}

export function atualizarMovimentacao(id, movimentacao) {
  verificarFirebase();
  const movimentacaoRef = doc(db, "historicoMovimentacoes", id);

  return updateDoc(movimentacaoRef, movimentacao);
}

export function listarMovimentacoes(callback, tratarErro) {
  if (!db) {
    callback([]);
    return () => {};
  }

  const historicoCollection = collection(db, "historicoMovimentacoes");
  const consultaHistorico = query(historicoCollection, orderBy("criadoEm", "desc"));

  return onSnapshot(
    consultaHistorico,
    (snapshot) => {
      const movimentacoes = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      callback(movimentacoes);
    },
    (error) => {
      if (tratarErro) {
        tratarErro(error);
      }
    },
  );
}

export function cadastrarJustificativa(justificativa) {
  verificarFirebase();
  const justificativaRef = doc(collection(db, "justificativas"));
  const criadoEm = Date.now();

  return setDoc(justificativaRef, {
    ...justificativa,
    criadoEm,
    data: new Date(criadoEm).toISOString(),
  });
}

export function atualizarJustificativa(id, justificativa) {
  verificarFirebase();
  const justificativaRef = doc(db, "justificativas", id);

  return updateDoc(justificativaRef, justificativa);
}

export function listarJustificativas(callback, tratarErro) {
  if (!db) {
    callback([]);
    return () => {};
  }

  const justificativasCollection = collection(db, "justificativas");
  const consultaJustificativas = query(
    justificativasCollection,
    orderBy("criadoEm", "desc"),
  );

  return onSnapshot(
    consultaJustificativas,
    (snapshot) => {
      const justificativas = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      callback(justificativas);
    },
    (error) => {
      if (tratarErro) {
        tratarErro(error);
      }
    },
  );
}

// Migracao unica: o sistema antigo criava um segundo documento para o mesmo
// produto quando ele ia para os baldes, o que duplicava o item na listagem.
// Agora cada produto e um documento so, com o saldo dos baldes em
// quantidadePequeno. Esta funcao funde o que ficou para tras.
export async function unificarProdutosDuplicados() {
  if (!db) return { fundidos: 0 };

  const snapshot = await getDocs(collection(db, "produtos"));
  const todos = snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));

  const doEstoquePequeno = todos.filter(
    (produto) => produto.tipoEstoque === "pequeno",
  );

  if (doEstoquePequeno.length === 0) return { fundidos: 0 };

  const chave = (produto) =>
    String(produto.codigo || produto.nome || "")
      .trim()
      .toLowerCase();

  const principais = new Map(
    todos
      .filter((produto) => (produto.tipoEstoque || "principal") === "principal")
      .map((produto) => [chave(produto), produto]),
  );

  let fundidos = 0;

  for (const pequeno of doEstoquePequeno) {
    const principal = principais.get(chave(pequeno));
    const saldoPequeno = Number(pequeno.quantidadeKg || 0);

    if (principal) {
      await updateDoc(doc(db, "produtos", principal.id), {
        quantidadePequeno:
          Number(principal.quantidadePequeno || 0) + saldoPequeno,
      });
      await deleteDoc(doc(db, "produtos", pequeno.id));
    } else {
      // Sem par no pavilhao: vira um produto normal, com saldo so nos baldes.
      const { id: _id, ...dados } = pequeno;
      await setDoc(doc(db, "produtos", pequeno.id), {
        ...dados,
        tipoEstoque: "principal",
        quantidadeKg: 0,
        quantidadePequeno: saldoPequeno,
      });
    }

    fundidos += 1;
  }

  return { fundidos };
}
