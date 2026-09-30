import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, createSecondaryAuth, db, requireFirebase } from "../firebaseconfig";
import {
  OWNER_EMAIL,
  OWNER_PROTECTED_MESSAGE,
  OWNER_ROLE,
  isOwner,
  nomePerfil,
} from "../config/security";
import { criarLogAuditoria } from "./auditService";
import { withTimeout } from "./timeout";

const COLECAO_ADMINS = "admins";

// Semente do primeiro acesso do Owner. O sistema obriga a troca imediata,
// entao esta senha so funciona uma unica vez, para criar a conta raiz.
const SENHA_SEMENTE_OWNER = "1234567";

export const EMAIL_OWNER = OWNER_EMAIL;

export function ehOwner(perfil) {
  return isOwner(perfil);
}

function ehPerfilAdministrativo(perfil) {
  return (
    isOwner(perfil) ||
    (["admin", "superadmin"].includes(perfil?.role) && !perfil?.adminAccessRevoked)
  );
}

function adminRef(uid) {
  requireFirebase();
  return doc(db, COLECAO_ADMINS, uid);
}

function adminsRef() {
  requireFirebase();
  return collection(db, COLECAO_ADMINS);
}

async function registrarBloqueioOwner(perfilAtuante, alvo, descricao) {
  await criarLogAuditoria(perfilAtuante, {
    action: "PERMISSION_DENIED",
    entity: "user",
    entityId: alvo?.uid || null,
    description: descricao,
    before: alvo,
  }).catch(() => {});
}

async function garantirAlvoNaoOwner(alvo, perfilAtuante, descricao) {
  if (!isOwner(alvo)) return;
  await registrarBloqueioOwner(
    perfilAtuante,
    alvo,
    descricao || "Tentativa bloqueada de alterar/remover/desativar o Owner.",
  );
  throw new Error(OWNER_PROTECTED_MESSAGE);
}

export async function buscarPerfilAdmin(uid) {
  requireFirebase();
  const snapshot = await withTimeout(
    getDoc(adminRef(uid)),
    "Nao foi possivel consultar o perfil. Confira as regras do Firestore.",
  );

  if (!snapshot.exists()) return null;

  return { uid, ...snapshot.data() };
}

// `comSenhaSemente` distingue os dois caminhos: a conta criada agora pela
// senha semente precisa troca-la; uma conta que ja existia no Authentication
// tem senha propria e nao deve ser forcada a nada.
function perfilOwnerInicial({ comSenhaSemente }) {
  const agora = Date.now();

  return {
    nome: "Eduardo Paim",
    name: "Eduardo Paim",
    email: OWNER_EMAIL.toLowerCase(),
    role: OWNER_ROLE,
    active: true,
    mustChangePassword: comSenhaSemente,
    temporaryPassword: comSenhaSemente ? SENHA_SEMENTE_OWNER : null,
    bootstrap: true,
    criadoEm: agora,
    createdAt: agora,
    updatedAt: agora,
  };
}

async function criarOwnerInicial(email, senha) {
  const ehEmailDoOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();

  if (!ehEmailDoOwner) {
    throw new Error("E-mail ou senha incorretos.");
  }

  // O e-mail confere, mas a senha nao e a semente: provavelmente um banco
  // novo, onde a conta ainda nao existe e so a semente cria o Owner.
  if (senha !== SENHA_SEMENTE_OWNER) {
    throw new Error(
      "A conta do Owner ainda nao existe neste banco. Entre com a senha inicial do sistema para cria-la e defina a sua senha em seguida.",
    );
  }

  let credencial;
  try {
    credencial = await withTimeout(
      createUserWithEmailAndPassword(auth, email, senha),
      "Nao foi possivel criar o administrador inicial.",
    );
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      throw new Error(
        "Este e-mail ja existe na autenticacao. Use a senha correta ou fale com o administrador.",
      );
    }
    throw error;
  }

  const perfil = perfilOwnerInicial({ comSenhaSemente: true });
  await withTimeout(
    setDoc(adminRef(credencial.user.uid), perfil),
    "Administrador criado, mas o Firestore recusou salvar o perfil. Confira as regras.",
  );

  return { uid: credencial.user.uid, ...perfil };
}

export async function entrarComoAdmin(email, senha) {
  requireFirebase();

  let credencial;
  try {
    credencial = await withTimeout(
      signInWithEmailAndPassword(auth, email, senha),
      "O login demorou demais. Confira se o provedor e-mail/senha esta ativo.",
    );
  } catch (error) {
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/invalid-login-credentials"
    ) {
      return criarOwnerInicial(email, senha);
    }
    throw error;
  }

  const perfil = await buscarPerfilAdmin(credencial.user.uid);
  const emailUsuario = (credencial.user.email || email).toLowerCase();

  if (!perfil) {
    // Conta existe na autenticacao mas perdeu o documento: so o Owner e recriado.
    if (emailUsuario === OWNER_EMAIL.toLowerCase()) {
      // A conta ja existia no Authentication com senha propria.
      const perfilOwner = perfilOwnerInicial({ comSenhaSemente: false });
      await setDoc(adminRef(credencial.user.uid), perfilOwner);
      return { uid: credencial.user.uid, ...perfilOwner };
    }

    await signOut(auth);
    throw new Error(
      "Este usuario existe na autenticacao, mas nao esta cadastrado como professor.",
    );
  }

  // O Owner se autocorrige: nunca fica sem papel nem desativado.
  if (isOwner(perfil) && (perfil.role !== OWNER_ROLE || perfil.active !== true)) {
    const correcao = { role: OWNER_ROLE, active: true, updatedAt: Date.now() };
    await updateDoc(adminRef(credencial.user.uid), correcao);
    return { ...perfil, ...correcao };
  }

  if (perfil.active === false) {
    await signOut(auth);
    throw new Error("Este acesso esta desativado. Procure um administrador.");
  }

  return perfil;
}

export async function sairDaConta() {
  if (!auth) return;
  await signOut(auth);
}

// Criacao de usuario pelo super admin: gera a conta em um app secundario para
// nao derrubar a sessao atual e marca senha temporaria de primeiro acesso.
export async function criarUsuario({ nome, email, senha, role }, perfilAtuante) {
  requireFirebase();

  const emailNormalizado = email.trim().toLowerCase();
  if (emailNormalizado === OWNER_EMAIL.toLowerCase()) {
    throw new Error("O e-mail do Owner nao pode ser cadastrado pelo painel.");
  }

  const secundario = createSecondaryAuth();
  try {
    const snapshot = await getDocs(adminsRef());
    const existenteDoc = snapshot.docs.find(
      (documento) =>
        String(documento.data().email || "").toLowerCase() === emailNormalizado,
    );

    if (existenteDoc) {
      const existente = { uid: existenteDoc.id, ...existenteDoc.data() };

      if (existente.active !== false && !existente.adminAccessRevoked) {
        throw new Error("Este e-mail ja esta cadastrado.");
      }

      await garantirAlvoNaoOwner(
        existente,
        perfilAtuante,
        "Tentativa bloqueada de reativar/alterar o Owner.",
      );

      // Reativacao: troca a senha da conta existente pela nova temporaria.
      if (existente.temporaryPassword) {
        await signInWithEmailAndPassword(
          secundario.auth,
          existente.email,
          existente.temporaryPassword,
        );
        await updatePassword(secundario.auth.currentUser, senha);
      }

      const dados = {
        ...existenteDoc.data(),
        nome,
        name: nome,
        email: emailNormalizado,
        role,
        active: true,
        adminAccessRevoked: false,
        adminRevocationNoticePending: false,
        mustChangePassword: true,
        temporaryPassword: senha,
        updatedAt: Date.now(),
      };

      await withTimeout(
        setDoc(adminRef(existente.uid), dados),
        "Nao foi possivel reativar o usuario no Firestore.",
      );
      await criarLogAuditoria(perfilAtuante, {
        action: "USER_CREATE",
        entity: "user",
        entityId: existente.uid,
        description: `${nome} foi reativado com senha temporaria.`,
        before: existente,
        after: {
          nome,
          email: emailNormalizado,
          role,
          active: true,
          mustChangePassword: true,
        },
      }).catch(() => {});
      await signOut(secundario.auth);
      return;
    }

    let credencial;
    try {
      credencial = await withTimeout(
        createUserWithEmailAndPassword(secundario.auth, emailNormalizado, senha),
        "O cadastro do usuario demorou demais. Confira a autenticacao.",
      );
    } catch (error) {
      if (error.code !== "auth/email-already-in-use") throw error;

      credencial = await withTimeout(
        signInWithEmailAndPassword(secundario.auth, emailNormalizado, senha),
        "Este e-mail ja existe na autenticacao. Use a mesma senha temporaria anterior ou remova o usuario no Firebase Authentication.",
      );
    }

    const agora = Date.now();
    await withTimeout(
      setDoc(adminRef(credencial.user.uid), {
        nome,
        name: nome,
        email: emailNormalizado,
        role,
        active: true,
        mustChangePassword: true,
        temporaryPassword: senha,
        createdBy: perfilAtuante?.uid || "",
        createdByName: nomePerfil(perfilAtuante),
        criadoEm: agora,
        createdAt: agora,
        updatedAt: agora,
      }),
      "Usuario criado, mas o Firestore nao aceitou salvar o perfil.",
    );
    await criarLogAuditoria(perfilAtuante, {
      action: "USER_CREATE",
      entity: "user",
      entityId: credencial.user.uid,
      description: `${nome} foi cadastrado com senha temporaria.`,
      after: { nome, email: emailNormalizado, role, mustChangePassword: true },
    }).catch(() => {});
    await signOut(secundario.auth);
  } finally {
    await secundario.cleanup();
  }
}

export function acompanharUsuarios(callback, tratarErro) {
  if (!db) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    adminsRef(),
    (snapshot) => {
      const usuarios = snapshot.docs
        .map((documento) => ({ uid: documento.id, ...documento.data() }))
        .filter(ehPerfilAdministrativo)
        .sort((a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0));

      callback(usuarios);
    },
    (error) => {
      if (tratarErro) tratarErro(error);
    },
  );
}

export async function atualizarUsuario(uid, dados, perfilAtuante, anterior = null) {
  requireFirebase();
  await garantirAlvoNaoOwner(
    anterior,
    perfilAtuante,
    "Tentativa bloqueada de alterar papel/acesso do Owner.",
  );

  await updateDoc(adminRef(uid), { ...dados, updatedAt: Date.now() });

  const nome = nomePerfil(anterior);
  let acao = "UPDATE";
  let descricao = "Dados do usuario atualizados.";

  if (Object.hasOwn(dados, "role") && anterior?.role !== dados.role) {
    if (dados.role === "superadmin") {
      acao = "USER_PROMOTE";
      descricao = `${nome} foi promovido para Super Admin.`;
    } else {
      acao = "USER_DEMOTE";
      descricao = `${nome} foi rebaixado para professor.`;
    }
  } else if (Object.hasOwn(dados, "active")) {
    descricao = dados.active ? `${nome} foi reativado.` : `${nome} foi desativado.`;
  }

  await criarLogAuditoria(perfilAtuante, {
    action: acao,
    entity: "user",
    entityId: uid,
    description: descricao,
    before: anterior,
    after: dados,
  }).catch(() => {});
}

// Nao apaga o usuario: revoga o acesso administrativo e deixa um aviso
// pendente para ele ver no proximo acesso.
export async function revogarAcessoAdmin(uid, perfilAtuante, anterior = null) {
  requireFirebase();
  await garantirAlvoNaoOwner(
    anterior,
    perfilAtuante,
    "Tentativa bloqueada de revogar o acesso administrativo do Owner.",
  );

  const agora = Date.now();
  const dados = {
    role: "public",
    active: true,
    adminAccessRevoked: true,
    adminAccessRevokedAt: agora,
    adminAccessRevokedBy: perfilAtuante?.uid || "",
    adminAccessRevokedByName: nomePerfil(perfilAtuante),
    adminAccessRevokedReason: "Acesso administrativo revogado pelo painel",
    adminRevocationNoticePending: true,
    mustChangePassword: false,
    temporaryPassword: null,
    updatedAt: agora,
  };

  await updateDoc(adminRef(uid), dados);
  await criarLogAuditoria(perfilAtuante, {
    action: "USER_DELETE",
    entity: "user",
    entityId: uid,
    description: `${nomePerfil(anterior)} teve o acesso administrativo revogado.`,
    before: anterior,
    after: dados,
  }).catch(() => {});
}

export async function confirmarAvisoRevogacao(perfil) {
  requireFirebase();
  if (!perfil?.uid || isOwner(perfil)) return;

  await updateDoc(adminRef(perfil.uid), {
    adminRevocationNoticePending: false,
    updatedAt: Date.now(),
  }).catch(() => {});
  await criarLogAuditoria(perfil, {
    action: "UPDATE",
    entity: "user",
    entityId: perfil.uid,
    description: "Usuario foi notificado sobre a revogacao do acesso administrativo.",
  }).catch(() => {});
  await sairDaConta();
}
