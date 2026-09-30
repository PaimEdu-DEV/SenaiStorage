import { Eye, EyeOff, Plus } from "lucide-react";
import { formatarValorCampo } from "../config/campos";

// Inputs dos campos criados pelo admin. O componente nao sabe de produto:
// recebe as definicoes, os valores e devolve a mudanca.
export default function CamposPersonalizados({
  campos,
  valores = {},
  aoMudar,
  aoCriarCampo,
  podeCriar = false,
}) {
  if (campos.length === 0 && !podeCriar) return null;

  function definir(campo, valor) {
    aoMudar({ ...valores, [campo.chave]: valor });
  }

  return (
    <div className="campos-personalizados">
      <div className="campos-cabecalho">
        <span>Campos adicionais</span>

        {podeCriar && (
          <button type="button" className="btn-secondary" onClick={aoCriarCampo}>
            <Plus size={15} />
            Novo campo
          </button>
        )}
      </div>

      {campos.length === 0 ? (
        <p className="field-hint">
          Nenhum campo adicional ainda. Crie um para registrar informacoes
          proprias deste cadastro, como a maquina compativel.
        </p>
      ) : (
        <div className="form-row campos-lista">
          {campos.map((campo) => {
            const valor = valores[campo.chave] ?? "";

            return (
              <label
                key={campo.id}
                className={campo.tipo === "textoLongo" ? "campo-largo" : undefined}
              >
                <span className="campo-titulo">
                  {campo.rotulo}
                  {campo.visivelParaAluno === false ? (
                    <span className="campo-selo" title="Oculto para o aluno">
                      <EyeOff size={12} /> interno
                    </span>
                  ) : (
                    <span className="campo-selo visivel" title="Visivel para o aluno">
                      <Eye size={12} /> aluno ve
                    </span>
                  )}
                </span>

                {campo.tipo === "textoLongo" && (
                  <textarea
                    value={valor}
                    required={campo.obrigatorio}
                    onChange={(evento) => definir(campo, evento.target.value)}
                  />
                )}

                {campo.tipo === "texto" && (
                  <input
                    type="text"
                    value={valor}
                    required={campo.obrigatorio}
                    onChange={(evento) => definir(campo, evento.target.value)}
                  />
                )}

                {campo.tipo === "numero" && (
                  <input
                    type="number"
                    step="0.01"
                    value={valor}
                    required={campo.obrigatorio}
                    onChange={(evento) => definir(campo, evento.target.value)}
                  />
                )}

                {campo.tipo === "data" && (
                  <input
                    type="date"
                    value={valor}
                    required={campo.obrigatorio}
                    onChange={(evento) => definir(campo, evento.target.value)}
                  />
                )}

                {campo.tipo === "selecao" && (
                  <select
                    value={valor}
                    required={campo.obrigatorio}
                    onChange={(evento) => definir(campo, evento.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {(campo.opcoes || []).map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </select>
                )}

                {campo.tipo === "simNao" && (
                  <span className="campo-sim-nao">
                    <input
                      type="checkbox"
                      role="switch"
                      className="toggle-switch"
                      checked={valor === true}
                      onChange={(evento) => definir(campo, evento.target.checked)}
                    />
                    <small>{valor === true ? "Sim" : "Nao"}</small>
                  </span>
                )}

                {campo.ajuda && <span className="field-hint">{campo.ajuda}</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Versao de leitura, usada nas telas em que o aluno so consulta.
export function ListaCamposPersonalizados({ campos, valores = {} }) {
  const preenchidos = campos.filter((campo) => {
    const valor = valores[campo.chave];
    return valor !== undefined && valor !== null && valor !== "";
  });

  if (preenchidos.length === 0) return null;

  return (
    <dl className="campos-leitura">
      {preenchidos.map((campo) => (
        <div key={campo.id}>
          <dt>{campo.rotulo}</dt>
          <dd>{formatarValorCampo(campo, valores[campo.chave])}</dd>
        </div>
      ))}
    </dl>
  );
}
