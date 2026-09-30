import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/useAuth";
import { confirmarAvisoRevogacao } from "../services/userService";

// Aviso unico exibido ao usuario que teve o acesso administrativo revogado.
export default function AcessoRevogadoModal() {
  const { perfil, sair } = useAuth();
  const [carregando, setCarregando] = useState(false);

  async function confirmar() {
    setCarregando(true);
    try {
      await confirmarAvisoRevogacao(perfil);
    } catch (error) {
      console.error(error);
      await sair();
    } finally {
      setCarregando(false);
    }
  }

  const data = perfil?.adminAccessRevokedAt
    ? new Date(perfil.adminAccessRevokedAt).toLocaleString("pt-BR")
    : null;

  return (
    <div className="usage-overlay" role="dialog" aria-modal="true">
      <div className="usage-modal auth-modal">
        <div className="usage-header">
          <div>
            <span>Acesso administrativo</span>
            <h2>Seu acesso foi revogado</h2>
          </div>
        </div>

        <div className="auth-alert">
          <AlertTriangle size={20} />
          <div>
            <strong>
              {perfil?.adminAccessRevokedReason || "Acesso administrativo revogado."}
            </strong>
            <p>
              Revogado por {perfil?.adminAccessRevokedByName || "um Super Admin"}
              {data ? ` em ${data}` : ""}. Voce continua podendo usar o sistema como
              aluno.
            </p>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={confirmar}
            disabled={carregando}
          >
            {carregando ? "Confirmando..." : "Entendi"}
          </button>
        </div>
      </div>
    </div>
  );
}
