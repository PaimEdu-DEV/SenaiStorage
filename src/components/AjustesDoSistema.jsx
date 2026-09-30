import { Clock, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { podeFazer } from "../config/security";
import { useAuth } from "../contexts/useAuth";
import { listarConfiguracoesSistema, salvarConfiguracoesSistema } from "../crud";
import { traduzirErro } from "../lib/mensagensErro";
import { criarLogAuditoria } from "../services/auditService";

// Ajustes que antes moravam na aba Configuracoes. Ficam junto da Equipe
// porque tratam de acesso e de regras que valem para todo mundo.
export default function AjustesDoSistema({ aoGerarLink }) {
  const { perfil, ehAdmin } = useAuth();
  const [horario, setHorario] = useState("17:00");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);

  const podeEditar = ehAdmin && podeFazer(perfil, "configuracoes.editar");
  const podeGerarLinks = ehAdmin && podeFazer(perfil, "links.gerar");

  useEffect(
    () =>
      listarConfiguracoesSistema(
        (configuracoes) => setHorario(configuracoes.horarioJustificativa || "17:00"),
        (error) => setErro(traduzirErro(error)),
      ),
    [],
  );

  async function salvar(evento) {
    evento.preventDefault();
    setErro("");
    setMensagem("");
    setSalvando(true);

    try {
      await salvarConfiguracoesSistema({ horarioJustificativa: horario });
      await criarLogAuditoria(perfil, {
        action: "CONFIG_UPDATE",
        entity: "config",
        description: `Horario de cobranca de justificativa definido para ${horario}.`,
      }).catch(() => {});
      setMensagem("Horario salvo.");
    } catch (error) {
      setErro(traduzirErro(error));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditar && !podeGerarLinks) return null;

  return (
    <section className="form-container">
      <div className="form-title">
        <span>Ajustes</span>
        <h2>Regras e acessos</h2>
      </div>

      <div className="settings-grid">
        {podeEditar && (
          <article className="settings-card">
            <div className="settings-card-title">
              <Clock size={20} />
              <strong>Horario de justificativa</strong>
            </div>

            <p>
              A partir deste horario, o aluno precisa justificar os usos de aula
              que nao fecharam a conta.
            </p>

            <form className="settings-form single-setting-form" onSubmit={salvar}>
              <label>
                Cobrar justificativa as
                <input
                  type="time"
                  value={horario}
                  onChange={(evento) => setHorario(evento.target.value)}
                />
              </label>

              <button type="submit" className="btn-secondary" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar horario"}
              </button>
            </form>

            {mensagem && <p className="form-hint">{mensagem}</p>}
            {erro && <p className="form-error">{erro}</p>}
          </article>
        )}

        {podeGerarLinks && (
          <article className="settings-card">
            <div className="settings-card-title">
              <Link2 size={20} />
              <strong>Acesso temporario</strong>
            </div>

            <p>
              Gere um link para o aluno consultar o estoque sem precisar de conta.
            </p>

            <button type="button" className="btn-secondary" onClick={aoGerarLink}>
              Gerar link
            </button>
          </article>
        )}
      </div>
    </section>
  );
}
