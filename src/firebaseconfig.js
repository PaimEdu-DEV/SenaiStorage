import { deleteApp, getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Cole aqui as configuracoes do seu projeto Firebase.
// Voce encontra esses dados no Console do Firebase:
// Configuracoes do projeto > Seus apps > SDK setup and configuration.
export const firebaseConfig = {
  apiKey: "AIzaSyBZMSc_wB0dVm255w2buNpwTStzxPGwWpU",
  authDomain: "senaistorage.firebaseapp.com",
  projectId: "senaistorage",
  storageBucket: "senaistorage.firebasestorage.app",
  messagingSenderId: "493428338852",
  appId: "1:493428338852:web:7719cb327e60336bd1b631",
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
