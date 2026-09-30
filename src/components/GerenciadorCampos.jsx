import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { CONTEXTOS, TIPOS_CAMPO } from "../config/campos";
import { useAuth } from "../contexts/useAuth";
import { useCampos } from "../hooks/useCampos";
import { traduzirErro } from "../lib/mensagensErro";
import {
  alternarVisibilidade,
  excluirCampo,
  reordenarCampos,
} from "../services/camposService";
import ModalCampo from "./ModalCampo";

function nomeTipo(tipo) {
  return TIPOS_CAMPO.find((item) => item.id === tipo)?.titulo || tipo;
}

export function ListaDeCampos({ contexto, aoPedirConfirmacao }) {
  const { perfil } = useAuth();
  const { todos } = useCampos(contexto, { ehAdmin: true });
  const [editando, setEditando] = useState(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  async function executar(acao) {
    setErro("");
    try {
      await acao();
    } catch (error) {
      setErro(traduzirErro(error));
    }
  }

  function mover(indice, direcao) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= todos.length) return;

    const proximos = [...todos];
    [proximos[indice], proximos[destino]] = [proximos[destino], proximos[indice]];
    executar(() => reordenarCampos(proximos, perfil));
  }

  return (
    <div className="lista-campos">
      <div className="lista-campos-topo">
        <p className="field-hint">{CONTEXTOS[contexto].descricao}</p>

        <button type="button" className="btn-secondary" onClick={() => setCriando(true)}>
          <Plus size={15} />
          Novo campo
        </button>
      </div>

      {erro && <p className="form-error">{erro}</p>}

      <div className="admin-panel-table campos-table">
        <div className="admin-panel-row admin-panel-head">
          <span>Campo</span>
          <span>Tipo</span>
          <span>Aluno</span>
          <span />
        </div>

        {todos.map((campo, indice) => (
          <div className="admin-panel-row" key={campo.id}>
            <div>
              <strong>
                {campo.sistema && <Lock size={12} />}
                {campo.rotulo}
              </strong>
              <small>
                {campo.sistema ? "Campo do sistema" : "Campo personalizado"}
                {campo.obrigatorio ? " - obrigatorio" : ""}
              </small>
            </div>

            <div>
              <small>{nomeTipo(campo.tipo)}</small>
            </div>

            <div>
              <button
                type="button"
                className={
                  campo.visivelParaAluno === false ? "role-tag off" : "role-tag super"
                }
                disabled={campo.visibilidadeTravada}
                title={
                  campo.visibilidadeTravada
                    ? "Campo essencial: sempre visivel"
                    : "Alternar visibilidade para o aluno"
                }
                onClick={() => executar(() => alternarVisibilidade(campo, perfil))}
              >
                {campo.visivelParaAluno === false ? (
                  <>
                    <EyeOff size={12} /> Oculto
                  </>
                ) : (
                  <>
                    <Eye size={12} /> Visivel
                  </>
                )}
              </button>
            </div>

            <div className="admin-panel-actions">
              <button
                type="button"
                className="icon-button"
                title="Subir"
                disabled={indice === 0}
                onClick={() => mover(indice, -1)}
              >
                <ArrowUp size={16} />
              </button>

              <button
                type="button"
                className="icon-button"
                title="Descer"
                disabled={indice === todos.length - 1}
                onClick={() => mover(indice, 1)}
              >
                <ArrowDown size={16} />
              </button>

              <button
                type="button"
                className="icon-button edit"
                title="Editar campo"
                onClick={() => setEditando(campo)}
              >
                <Pencil size={16} />
              </button>

              {!campo.sistema && (
                <button
                  type="button"
                  className="icon-button delete"
                  title="Excluir campo"
                  onClick={() =>
                    aoPedirConfirmacao?.({
                      titulo: "Excluir campo",
                      descricao: `O campo '${campo.rotulo}' sera removido do formulario. Os valores ja preenchidos nos produtos continuam gravados, mas deixam de aparecer na tela.`,
                      rotuloAcao: "Excluir campo",
                      aoConfirmar: () => executar(() => excluirCampo(campo, perfil)),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {(criando || editando) && (
        <ModalCampo
          contexto={contexto}
          campo={editando}
          aoFechar={() => {
            setCriando(false);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

// Abre a mesma lista em um modal, para gerenciar os campos sem sair do
// formulario que esta sendo preenchido.
export default function ModalGerenciarCampos({ contexto, aoFechar, aoPedirConfirmacao }) {
  return (
    <div className="usage-overlay usage-overlay-topo" role="dialog" aria-modal="true">
      <div className="usage-modal gerenciar-campos-modal">
        <div className="usage-header">
          <div>
            <span>{CONTEXTOS[contexto].titulo}</span>
            <h2>Gerenciar campos</h2>
          </div>

          <button
            type="button"
            className="close-modal"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <ListaDeCampos contexto={contexto} aoPedirConfirmacao={aoPedirConfirmacao} />

        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={aoFechar}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
