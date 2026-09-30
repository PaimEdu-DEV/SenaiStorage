import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  ScrollText,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { podeFazer } from "../config/security";
import { useAuth } from "../contexts/useAuth";
import {
  ACOES_AUDITAVEIS,
  ENTIDADES_AUDITAVEIS,
  formatarAcao,
  formatarDataLog,
  formatarDescricaoLog,
  formatarEntidade,
  varianteAcao,
} from "../lib/auditFormat";
import { traduzirErro } from "../lib/mensagensErro";
import { acompanharLogs, criarLogAuditoria, filtrarLogs } from "../services/auditService";
import {
  exportarEstoquePdf,
  exportarEstoquePlanilha,
  exportarLogsPdf,
} from "../services/relatorioService";

const filtrosIniciais = {
  busca: "",
  acao: "Todos",
  entidade: "Todos",
  usuario: "Todos",
  dataInicial: "",
  dataFinal: "",
};

const porPagina = 25;

export default function PaginaAuditoria({ produtos = [] }) {
  const { perfil, ehAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState("");

  const podeVer = podeFazer(perfil, "auditoria.ver");
  const podeExportar = podeFazer(perfil, "relatorios.exportar");

  useEffect(() => {
    if (!podeVer) return undefined;

    return acompanharLogs(setLogs, (error) =>
      setErro(traduzirErro(error, "Nao foi possivel carregar a auditoria.")),
    );
  }, [podeVer]);

  useEffect(() => {
    setPagina(1);
  }, [filtros]);

  const usuarios = useMemo(
    () => [
      "Todos",
      ...new Set(logs.map((log) => log.userEmail || log.userName).filter(Boolean)),
    ],
    [logs],
  );

  const logsFiltrados = useMemo(() => filtrarLogs(logs, filtros), [logs, filtros]);
  const totalPaginas = Math.max(1, Math.ceil(logsFiltrados.length / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visiveis = logsFiltrados.slice(
    (paginaSegura - 1) * porPagina,
    paginaSegura * porPagina,
  );

  if (!ehAdmin || !podeVer) {
    return (
      <section className="tab-page">
        <div className="empty-state">
          <p>Voce nao tem permissao para ver a auditoria.</p>
        </div>
      </section>
    );
  }

  function registrarExportacao(formato) {
    criarLogAuditoria(perfil, {
      action: "EXPORT",
      entity: "relatorio",
      description: `Relatorio de estoque exportado em ${formato} com ${produtos.length} item(ns).`,
    }).catch(() => {});
  }

  return (
    <section className="tab-page">
      <section className="form-container">
        <div className="form-title">
          <span>Relatorios</span>
          <h2>Exportar estoque</h2>
        </div>

        <p className="form-hint">
          Gera a lista completa dos itens, com os saldos do pavilhao e dos baldes lado
          a lado. {produtos.length} item(ns) no sistema.
        </p>

        <div className="form-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={!podeExportar || produtos.length === 0}
            onClick={() => {
              exportarEstoquePlanilha(produtos, perfil);
              registrarExportacao("planilha");
            }}
          >
            <FileSpreadsheet size={16} />
            Exportar planilha
          </button>

          <button
            type="button"
            className="btn-secondary"
            disabled={!podeExportar || produtos.length === 0}
            onClick={() => {
              exportarEstoquePdf(produtos, perfil);
              registrarExportacao("PDF");
            }}
          >
            <FileText size={16} />
            Exportar PDF
          </button>
        </div>

        {!podeExportar && (
          <p className="field-hint">
            Voce nao tem a permissao de exportar relatorios.
          </p>
        )}
      </section>

      <section className="form-container">
        <div className="form-title">
          <span>Auditoria</span>
          <h2>Registro de atividades</h2>
        </div>

        <p className="form-hint">
          Toda acao administrativa fica registrada: quem fez, o que fez e quando.
        </p>

        <div className="auditoria-filtros">
          <span className="search-input-wrap">
            <Search size={16} />
            <input
              className="usage-search"
              placeholder="Buscar por usuario, acao ou descricao..."
              value={filtros.busca}
              onChange={(evento) =>
                setFiltros({ ...filtros, busca: evento.target.value })
              }
            />
          </span>

          <select
            value={filtros.acao}
            onChange={(evento) => setFiltros({ ...filtros, acao: evento.target.value })}
          >
            <option value="Todos">Todas as acoes</option>
            {ACOES_AUDITAVEIS.map((acao) => (
              <option key={acao} value={acao}>
                {formatarAcao(acao)}
              </option>
            ))}
          </select>

          <select
            value={filtros.entidade}
            onChange={(evento) =>
              setFiltros({ ...filtros, entidade: evento.target.value })
            }
          >
            <option value="Todos">Todas as entidades</option>
            {ENTIDADES_AUDITAVEIS.map((entidade) => (
              <option key={entidade} value={entidade}>
                {formatarEntidade(entidade)}
              </option>
            ))}
          </select>

          <select
            value={filtros.usuario}
            onChange={(evento) =>
              setFiltros({ ...filtros, usuario: evento.target.value })
            }
          >
            {usuarios.map((usuario) => (
              <option key={usuario}>{usuario}</option>
            ))}
          </select>

          <input
            type="date"
            value={filtros.dataInicial}
            onChange={(evento) =>
              setFiltros({ ...filtros, dataInicial: evento.target.value })
            }
          />

          <input
            type="date"
            value={filtros.dataFinal}
            onChange={(evento) =>
              setFiltros({ ...filtros, dataFinal: evento.target.value })
            }
          />

          <button
            type="button"
            className="btn-secondary"
            disabled={!podeExportar || logsFiltrados.length === 0}
            onClick={() => exportarLogsPdf(logsFiltrados, filtros, perfil)}
          >
            <FileText size={16} />
            Exportar auditoria
          </button>
        </div>

        {erro && <p className="form-error">{erro}</p>}

        {visiveis.length === 0 ? (
          <div className="empty-state">
            <ScrollText size={28} />
            <p>Nenhum registro encontrado. Ajuste os filtros para ampliar a busca.</p>
          </div>
        ) : (
          <>
            <div className="admin-panel-table auditoria-table">
              <div className="admin-panel-row admin-panel-head">
                <span>Data</span>
                <span>Usuario</span>
                <span>Acao</span>
                <span>Entidade</span>
                <span>Descricao</span>
              </div>

              {visiveis.map((log) => (
                <div className="admin-panel-row" key={log.id}>
                  <div>
                    <small>{formatarDataLog(log.createdAt)}</small>
                  </div>

                  <div>
                    <strong>{log.userName || "Sistema"}</strong>
                    <small>{log.userEmail || "-"}</small>
                  </div>

                  <div>
                    <span className={`role-tag ${varianteAcao(log.action)}`}>
                      {formatarAcao(log.action)}
                    </span>
                  </div>

                  <div>
                    <small>{formatarEntidade(log.entity)}</small>
                  </div>

                  <div>
                    <small>{formatarDescricaoLog(log)}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-pagination">
              <span>
                Mostrando {(paginaSegura - 1) * porPagina + 1}-
                {Math.min(paginaSegura * porPagina, logsFiltrados.length)} de{" "}
                {logsFiltrados.length} registros
              </span>

              <div>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={paginaSegura <= 1}
                  onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>

                <span className="pagina-atual">
                  {paginaSegura} / {totalPaginas}
                </span>

                <button
                  type="button"
                  className="btn-secondary"
                  disabled={paginaSegura >= totalPaginas}
                  onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
                >
                  Proxima
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </section>
  );
}
