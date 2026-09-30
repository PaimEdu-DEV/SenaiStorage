import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

// Confirmacao para acoes destrutivas: nada some da tela sem passar por aqui.
export default function ConfirmacaoModal({ pedido, aoFechar }) {
  const [processando, setProcessando] = useState(false);

  if (!pedido) return null;

  async function confirmar() {
    setProcessando(true);
    try {
      await pedido.aoConfirmar();
      aoFechar();
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="usage-overlay" role="dialog" aria-modal="true">
      <div className="usage-modal auth-modal">
        <div className="usage-header">
          <div>
            <span>Confirmacao</span>
            <h2>{pedido.titulo}</h2>
          </div>

          <button
            type="button"
            className="close-modal"
            onClick={aoFechar}
            aria-label="Cancelar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="auth-alert">
          <AlertTriangle size={20} />
          <div>
            <p>{pedido.descricao}</p>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-danger"
            onClick={confirmar}
            disabled={processando}
          >
            {processando ? "Processando..." : pedido.rotuloAcao || "Confirmar"}
          </button>

          <button type="button" className="btn-secondary" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
