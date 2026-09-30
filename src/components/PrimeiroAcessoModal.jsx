import { Eye, EyeOff, LockKeyhole, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/useAuth";
import { traduzirErro } from "../lib/mensagensErro";
import { concluirPrimeiroAcesso } from "../services/securityService";

// Bloqueio de primeiro acesso: enquanto a senha temporaria nao for trocada,
// o usuario nao chega ao painel.
export default function PrimeiroAcessoModal() {
  const { perfil, adotarPerfilDaSessao, sair } = useAuth();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [visivel, setVisivel] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setErro("");

    if (novaSenha !== confirmacao) {
      setErro("A confirmacao da senha nao confere.");
      return;
    }

    setCarregando(true);
    try {
      await concluirPrimeiroAcesso({ novaSenha, perfil });
      adotarPerfilDaSessao({
        ...perfil,
        mustChangePassword: false,
        temporaryPassword: null,
      });
    } catch (error) {
      setErro(traduzirErro(error, "Nao foi possivel definir a senha."));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="usage-overlay" role="dialog" aria-modal="true">
      <div className="usage-modal auth-modal">
        <div className="usage-header">
          <div>
            <span>Primeiro acesso</span>
            <h2>Defina sua senha</h2>
          </div>
        </div>

        <form className="auth-form" onSubmit={enviar}>
          <p className="auth-note">
            <LockKeyhole size={15} />
            <span>
              Voce entrou com uma senha temporaria. Escolha uma senha propria, de no
              minimo 6 caracteres, para liberar o painel.
            </span>
          </p>

          <label>
            Nova senha
            <span className="password-field">
              <input
                type={visivel ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={novaSenha}
                onChange={(evento) => setNovaSenha(evento.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setVisivel(!visivel)}
                aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
              >
                {visivel ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          <label>
            Confirmar nova senha
            <input
              type={visivel ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmacao}
              onChange={(evento) => setConfirmacao(evento.target.value)}
            />
          </label>

          {erro && <p className="form-error">{erro}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={carregando}>
              <LockKeyhole size={16} />
              {carregando ? "Definindo..." : "Definir senha"}
            </button>

            <button type="button" className="btn-secondary" onClick={sair}>
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
