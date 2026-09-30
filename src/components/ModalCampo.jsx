import { Plus, Save, X } from "lucide-react";
import { useState } from "react";
import { TIPOS_CAMPO, ehCampoDeSistema } from "../config/campos";
import { useAuth } from "../contexts/useAuth";
import { traduzirErro } from "../lib/mensagensErro";
import { salvarCampo } from "../services/camposService";

const vazio = {
  rotulo: "",
  tipo: "texto",
  opcoes: [],
  ajuda: "",
  obrigatorio: false,
  visivelParaAluno: true,
};

export default function ModalCampo({ contexto, campo, aoFechar, aoSalvar }) {
  const { perfil } = useAuth();
  const edicao = Boolean(campo);
  const deSistema = ehCampoDeSistema(campo);
  const [form, setForm] = useState(campo ? { ...vazio, ...campo } : vazio);
  const [novaOpcao, setNovaOpcao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function adicionarOpcao() {
    const valor = novaOpcao.trim();
    if (!valor || (form.opcoes || []).includes(valor)) return;

    setForm({ ...form, opcoes: [...(form.opcoes || []), valor] });
    setNovaOpcao("");
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro("");
    setSalvando(true);

    try {
      const salvo = await salvarCampo({ ...form, contexto }, perfil, campo);
      aoSalvar?.(salvo);
      aoFechar();
    } catch (error) {
      setErro(traduzirErro(error, "Nao foi possivel salvar o campo."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    // Abre por cima de outro modal (o cadastro do produto), entao precisa de
    // uma camada acima da padrao.
    <div className="usage-overlay usage-overlay-topo" role="dialog" aria-modal="true">
      <div className="usage-modal auth-modal">
        <div className="usage-header">
          <div>
            <span>{contexto === "estoque" ? "Estoque" : "Catalogo"}</span>
            <h2>{edicao ? "Editar campo" : "Novo campo"}</h2>
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

        <form className="auth-form" onSubmit={enviar}>
          <label>
            Nome do campo
            <input
              type="text"
              required
              maxLength={40}
              placeholder="Ex: Maquina compativel"
              value={form.rotulo}
              onChange={(evento) => setForm({ ...form, rotulo: evento.target.value })}
            />
          </label>

          <label>
            Tipo
            <select
              value={form.tipo}
              disabled={deSistema}
              onChange={(evento) => setForm({ ...form, tipo: evento.target.value })}
            >
              {TIPOS_CAMPO.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.titulo}
                </option>
              ))}
            </select>
            {deSistema && (
              <span className="field-hint">
                Campo do sistema: o tipo nao muda, mas voce pode renomear e
                escolher se o aluno ve.
              </span>
            )}
          </label>

          {form.tipo === "selecao" && !deSistema && (
            <label>
              Opcoes da lista
              <span className="opcoes-entrada">
                <input
                  type="text"
                  placeholder="Ex: Romi 130"
                  value={novaOpcao}
                  onChange={(evento) => setNovaOpcao(evento.target.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === "Enter") {
                      evento.preventDefault();
                      adicionarOpcao();
                    }
                  }}
                />
                <button type="button" className="icon-button" onClick={adicionarOpcao}>
                  <Plus size={16} />
                </button>
              </span>

              <span className="opcoes-lista">
                {(form.opcoes || []).map((opcao) => (
                  <button
                    type="button"
                    className="opcao-chip"
                    key={opcao}
                    onClick={() =>
                      setForm({
                        ...form,
                        opcoes: form.opcoes.filter((item) => item !== opcao),
                      })
                    }
                    title="Remover opcao"
                  >
                    {opcao}
                    <X size={12} />
                  </button>
                ))}
              </span>
            </label>
          )}

          <label>
            Texto de ajuda (opcional)
            <input
              type="text"
              maxLength={120}
              placeholder="Aparece abaixo do campo, explicando o preenchimento"
              value={form.ajuda || ""}
              onChange={(evento) => setForm({ ...form, ajuda: evento.target.value })}
            />
          </label>

          <label className="permissao-item">
            <span>
              Visivel para o aluno
              {campo?.visibilidadeTravada && (
                <small className="field-hint">
                  Este campo e essencial e sempre fica visivel.
                </small>
              )}
            </span>
            <input
              type="checkbox"
              role="switch"
              className="toggle-switch"
              disabled={campo?.visibilidadeTravada}
              checked={form.visivelParaAluno !== false}
              onChange={(evento) =>
                setForm({ ...form, visivelParaAluno: evento.target.checked })
              }
            />
          </label>

          {!deSistema && (
            <label className="permissao-item">
              <span>Preenchimento obrigatorio</span>
              <input
                type="checkbox"
                role="switch"
                className="toggle-switch"
                checked={form.obrigatorio === true}
                onChange={(evento) =>
                  setForm({ ...form, obrigatorio: evento.target.checked })
                }
              />
            </label>
          )}

          {erro && <p className="form-error">{erro}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={salvando}>
              <Save size={16} />
              {salvando ? "Salvando..." : edicao ? "Salvar campo" : "Criar campo"}
            </button>

            <button type="button" className="btn-secondary" onClick={aoFechar}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
