import { Eye, EyeOff, LogIn, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/useAuth";
import { traduzirErro } from "../lib/mensagensErro";
import { entrarComoAdmin } from "../services/userService";

export default function LoginModal({ aberto, aoFechar }) {
  const { adotarPerfilDaSessao } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  if (!aberto) return null;

  async function enviar(evento) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const perfil = await entrarComoAdmin(email.trim(), senha);
      adotarPerfilDaSessao(perfil);
      setEmail("");
      setSenha("");
      aoFechar();
    } catch (error) {
      setErro(traduzirErro(error, "Nao foi possivel entrar."));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="usage-overlay" role="dialog" aria-modal="true">
      <div className="usage-modal auth-modal">
        <div className="usage-header">
          <div>
            <span>Acesso restrito</span>
            <h2>Entrar como professor</h2>
          </div>

          <button
            type="button"
            className="close-modal"
            onClick={aoFechar}
            aria-label="Fechar login"
          >
            <X size={18} />
          </button>
        </div>

        <form className="auth-form" onSubmit={enviar}>
          <label>
            E-mail
            {/* autoComplete off: o navegador nao sugere e-mails ja digitados. */}
            <input
              type="email"
              required
              autoComplete="off"
              name="acesso-email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />
          </label>

          <label>
            Senha
            <span className="password-field">
              <input
                type={senhaVisivel ? "text" : "password"}
                required
                minLength={6}
                autoComplete="off"
                name="acesso-senha"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setSenhaVisivel(!senhaVisivel)}
                aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
              >
                {senhaVisivel ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          <p className="auth-note">
            <ShieldCheck size={15} />
            <span>
              Somente contas cadastradas por um Super Admin acessam o painel. Alunos
              continuam usando o sistema sem login.
            </span>
          </p>

          {erro && <p className="form-error">{erro}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={carregando}>
              <LogIn size={16} />
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
