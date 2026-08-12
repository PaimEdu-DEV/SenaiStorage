import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Cole aqui as configuracoes do seu projeto Firebase.
// Voce encontra esses dados no Console do Firebase:
// Configuracoes do projeto > Seus apps > SDK setup and configuration.
const firebaseConfig = {
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

const app = firebaseConfigurado ? initializeApp(firebaseConfig) : null;

export const db = app ? getFirestore(app) : null;
