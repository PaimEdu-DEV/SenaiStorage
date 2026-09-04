import {
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  });
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
