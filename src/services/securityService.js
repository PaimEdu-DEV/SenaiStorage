import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db, requireFirebase } from "../firebaseconfig";
import { criarLogAuditoria } from "./auditService";
import { withTimeout } from "./timeout";

export async function reautenticarUsuarioAtual(senha) {
  requireFirebase();
  const usuario = auth.currentUser;
  if (!usuario?.email) {
    throw new Error("Usuario autenticado nao encontrado.");
  }

  const credencial = EmailAuthProvider.credential(usuario.email, senha);

  return withTimeout(
    reauthenticateWithCredential(usuario, credencial),
    "Nao foi possivel confirmar sua senha atual.",
    10000,
  );
}

// Fecha o primeiro acesso: troca a senha temporaria por uma definitiva e
// limpa os marcadores que prendem o usuario na tela de troca de senha.
export async function concluirPrimeiroAcesso({ novaSenha, perfil }) {
  requireFirebase();
  const usuario = auth.currentUser;
  if (!usuario?.email) {
    throw new Error("Usuario autenticado nao encontrado.");
  }

  await withTimeout(
    updatePassword(usuario, novaSenha),
    "Nao foi possivel alterar a senha.",
    10000,
  );

  try {
    await updateDoc(doc(db, "admins", usuario.uid), {
      mustChangePassword: false,
      temporaryPassword: null,
      updatedAt: Date.now(),
    });
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("permission")) {
      throw new Error(
        "Acesso negado ao finalizar o primeiro acesso. Publique as regras atualizadas do Firestore e tente novamente.",
      );
    }
    throw error;
  }

  await criarLogAuditoria(perfil, {
    action: "UPDATE",
    entity: "user",
    entityId: usuario.uid,
    description: "Senha inicial definida no primeiro acesso.",
  }).catch(() => {});
}

// Troca de senha voluntaria, com confirmacao da senha atual.
export async function alterarSenha({ senhaAtual, novaSenha, perfil }) {
  requireFirebase();
  await reautenticarUsuarioAtual(senhaAtual);

  await withTimeout(
    updatePassword(auth.currentUser, novaSenha),
    "Nao foi possivel alterar a senha.",
    10000,
  );
  await updateDoc(doc(db, "admins", auth.currentUser.uid), {
    mustChangePassword: false,
    temporaryPassword: null,
    updatedAt: Date.now(),
  }).catch(() => {});
  await criarLogAuditoria(perfil, {
    action: "UPDATE",
    entity: "user",
    entityId: auth.currentUser.uid,
    description: "Senha alterada pelo proprio usuario.",
  }).catch(() => {});
}
