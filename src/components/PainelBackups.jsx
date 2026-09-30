import {
  AlertTriangle,
  DatabaseBackup,
  Download,
  History,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AUTO_BACKUP_INTERVAL } from "../config/security";
import { useAuth } from "../contexts/useAuth";
import { traduzirErro } from "../lib/mensagensErro";
import { proximoBackupAgendado } from "../lib/backupSchedule";
import {
  acompanharBackups,
  acompanharProtecaoBackup,
  carregarBackupCompleto,
  criarBackup,
  garantirBackupAutomatico,
  baixarBackupJson,
  ignorarProtecaoBackup,
  restaurarBackup,
  verificarIntegridade,
} from "../services/backupService";

const rotuloTipo = {
  manual: "Manual",
  automatic: "Automatico",
  pre_restore: "Pre-restauracao",
};

function formatarData(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("pt-BR");
}

export default function PainelBackups() {
  const { perfil, ehSuperAdmin, ehOwner } = useAuth();
  const [backups, setBackups] = useState([]);
  const [protecao, setProtecao] = useState({ active: false });
  const [integridade, setIntegridade] = useState(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const tratarErro = useCallback((error) => {
    setErro(traduzirErro(error, "Nao foi possivel carregar os backups."));
  }, []);

  useEffect(() => {
    if (!ehSuperAdmin) return undefined;

    const pararBackups = acompanharBackups(setBackups, tratarErro);
    const pararProtecao = acompanharProtecaoBackup(setProtecao, tratarErro);

    return () => {
      pararBackups();
      pararProtecao();
    };
  }, [ehSuperAdmin, tratarErro]);

  // Verificacao periodica: cria o backup automatico quando a janela agendada
  // chega e o painel esta aberto.
  useEffect(() => {
    if (!ehSuperAdmin) return undefined;

    let cancelado = false;

    async function verificar() {
      try {
        const criado = await garantirBackupAutomatico(perfil);
        if (criado && !cancelado) {
          setMensagem("Backup automatico criado pelo sistema.");
        }
      } catch (error) {
        console.error(error);
      }
    }

    verificar();
    const intervalo = window.setInterval(verificar, AUTO_BACKUP_INTERVAL);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, [ehSuperAdmin, perfil]);

  if (!ehSuperAdmin) return null;

  async function comCarregamento(acao, sucesso) {
    setErro("");
    setMensagem("");
    setOcupado(true);

    try {
      await acao();
      if (sucesso) setMensagem(sucesso);
    } catch (error) {
      if (error.integrity) setIntegridade(error.integrity);
      setErro(traduzirErro(error, "Nao foi possivel concluir a acao."));
    } finally {
      setOcupado(false);
    }
  }

  const protecaoAtiva = protecao?.active === true;

  return (
    <article className="settings-card settings-card-wide">
      <div className="settings-card-title">
        <DatabaseBackup size={20} />
        <strong>Backups do sistema</strong>
      </div>

      <p>
        Snapshot completo das colecoes do Firestore, usado para restaurar o sistema
        em caso de perda de dados.
      </p>

      <div className="backup-summary">
        <span>
          Agenda: <strong>dias 1 e 15, as 03:00</strong>
        </span>
        <span>
          Proximo: <strong>{proximoBackupAgendado()}</strong>
        </span>
        <span>
          Guardados: <strong>{backups.length}</strong>
        </span>
      </div>

      {protecaoAtiva && (
        <div className="admin-alert">
          <ShieldAlert size={20} />
          <div>
            <strong>Modo de protecao ativo</strong>
            <p>
              O sistema detectou uma reducao critica de dados e suspendeu os backups
              automaticos para preservar o ultimo backup valido de{" "}
              {formatarData(protecao.lastValidBackupAt)}.
              {ehOwner
                ? " Como Owner, voce pode ignorar a protecao por 10 minutos."
                : " Somente o Owner pode ignorar esta protecao."}
            </p>
          </div>
        </div>
      )}

      {integridade?.reasons?.length > 0 && (
        <div className="admin-alert waiting">
          <AlertTriangle size={20} />
          <div>
            <strong>Diferencas encontradas</strong>
            <p>
              {integridade.reasons
                .map(
                  (motivo) =>
                    `${motivo.key}: ${motivo.current} agora contra ${motivo.last} no ultimo backup`,
                )
                .join(" | ")}
            </p>
          </div>
        </div>
      )}

      {mensagem && <p className="form-hint">{mensagem}</p>}
      {erro && <p className="form-error">{erro}</p>}

      <div className="form-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={ocupado}
          onClick={() =>
            comCarregamento(
              () => criarBackup(perfil, "manual", { confirmarSuspeito: ehOwner }),
              "Backup manual criado com sucesso.",
            )
          }
        >
          <DatabaseBackup size={16} />
          {ocupado ? "Processando..." : "Criar backup agora"}
        </button>

        <button
          type="button"
          className="btn-secondary"
          disabled={ocupado}
          onClick={() =>
            comCarregamento(async () => {
              const resultado = await verificarIntegridade(perfil);
              setIntegridade(resultado);
              setMensagem(
                resultado.healthy
                  ? "Integridade verificada: nenhuma perda relevante de dados."
                  : "Atencao: reducao critica de dados detectada.",
              );
            })
          }
        >
          <History size={16} />
          Verificar integridade
        </button>

        {ehOwner && protecaoAtiva && (
          <button
            type="button"
            className="btn-danger"
            disabled={ocupado}
            onClick={() =>
              comCarregamento(
                () => ignorarProtecaoBackup(perfil),
                "Protecao ignorada por 10 minutos.",
              )
            }
          >
            <ShieldAlert size={16} />
            Ignorar protecao (10 min)
          </button>
        )}
      </div>

      <div className="admin-panel-table">
        <div className="admin-panel-row admin-panel-head">
          <span>Backup</span>
          <span>Tipo</span>
          <span>Conteudo</span>
          <span />
        </div>

        {backups.length === 0 && (
          <p className="admin-panel-empty">Nenhum backup registrado ainda.</p>
        )}

        {backups.map((backup) => (
          <div className="admin-panel-row" key={backup.id}>
            <div>
              <strong>{formatarData(backup.createdAt)}</strong>
              <small>por {backup.createdByName || "Sistema"}</small>
            </div>

            <div>
              <span
                className={
                  backup.type === "automatic" ? "role-tag" : "role-tag super"
                }
              >
                {rotuloTipo[backup.type] || backup.type}
              </span>
            </div>

            <div>
              <small>
                {backup.counts?.produtos || 0} produtos Â·{" "}
                {backup.counts?.movimentacoes || 0} movimentacoes Â·{" "}
                {backup.counts?.usuarios || 0} usuarios
              </small>
            </div>

            <div className="admin-panel-actions">
              <button
                type="button"
                className="icon-button"
                title="Baixar backup em JSON"
                disabled={ocupado}
                onClick={() =>
                  comCarregamento(async () => {
                    baixarBackupJson(await carregarBackupCompleto(backup.id));
                  })
                }
              >
                <Download size={16} />
              </button>

              {ehOwner && (
                <button
                  type="button"
                  className="icon-button delete"
                  title="Restaurar este backup"
                  disabled={ocupado}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Restaurar o backup de ${formatarData(backup.createdAt)}? Os dados atuais serao substituidos (um backup de seguranca sera criado antes).`,
                      )
                    ) {
                      return;
                    }

                    comCarregamento(
                      () => restaurarBackup(perfil, backup),
                      "Restauracao concluida.",
                    );
                  }}
                >
                  <Undo2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!ehOwner && (
        <p className="field-hint">
          A restauracao de backups e exclusiva do Owner do sistema.
        </p>
      )}
    </article>
  );
}
