import { deleteApp, getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Cole aqui as configuracoes do seu projeto Firebase.
// Voce encontra esses dados no Console do Firebase:
// Configuracoes do projeto > Seus apps > SDK setup and configuration.
export const firebaseConfig = {
  apiKey: "AIzaSyCk-9CNVDkcyPBL8rk9BVXtt2k7c3FX-fo",
  authDomain: "storage-senai.firebaseapp.com",
  projectId: "storage-senai",
  storageBucket: "storage-senai.firebasestorage.app",
  messagingSenderId: "429709668381",
  appId: "1:429709668381:web:c4411c635e1bf8bca256f4",
  measurementId: "G-9Z408JDLZ2",
};

export const firebaseConfigurado =
  firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI" &&
  firebaseConfig.projectId !== "COLE_SEU_PROJECT_ID_AQUI";

const app = firebaseConfigurado
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

export function requireFirebase() {
  if (!firebaseConfigurado || !app || !auth || !db) {
    throw new Error(
      "Firebase ainda nao foi configurado. Preencha src/firebaseconfig.js e recarregue a pagina.",
    );
  }
}

// App secundario: permite criar um novo usuario sem derrubar a sessao do
// super admin que esta fazendo o cadastro.
export function createSecondaryAuth() {
  requireFirebase();
  const nome = `admin-create-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, nome);

  return {
    auth: getAuth(secondaryApp),
    cleanup: () => deleteApp(secondaryApp),
  };
}
