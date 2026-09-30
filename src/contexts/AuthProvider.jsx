import { onAuthStateChanged } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { hasAdminAccess, isOwner, isPrivilegedAdmin } from "../config/security";
import { auth, firebaseConfigurado } from "../firebaseconfig";
import { buscarPerfilAdmin, sairDaConta } from "../services/userService";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!firebaseConfigurado || !auth) {
      setCarregando(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (usuarioAtual) => {
      setCarregando(true);
      setUsuario(usuarioAtual);

      if (usuarioAtual) {
        try {
          setPerfil(await buscarPerfilAdmin(usuarioAtual.uid));
        } catch (error) {
          console.error(error);
          setPerfil(null);
        }
      } else {
        setPerfil(null);
      }

      setCarregando(false);
    });
  }, []);

  // Usado logo apos o login e a troca de senha, quando ja temos o perfil
  // em maos e nao vale a pena esperar um novo ciclo do onAuthStateChanged.
  const adotarPerfilDaSessao = useCallback((proximoPerfil) => {
    setUsuario(auth?.currentUser || null);
    setPerfil(proximoPerfil);
    setCarregando(false);
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      perfil,
      carregando,
      firebaseConfigurado,
      ehAdmin: hasAdminAccess(perfil),
      ehSuperAdmin: isPrivilegedAdmin(perfil),
      ehOwner: isOwner(perfil),
      precisaTrocarSenha: Boolean(perfil?.mustChangePassword),
      acessoRevogado: Boolean(
        perfil?.adminAccessRevoked && perfil?.adminRevocationNoticePending,
      ),
      adotarPerfilDaSessao,
      sair: async () => {
        await sairDaConta();
        setUsuario(null);
        setPerfil(null);
      },
    }),
    [usuario, perfil, carregando, adotarPerfilDaSessao],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
