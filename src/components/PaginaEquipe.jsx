import {
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  OWNER_PROTECTED_MESSAGE,
  PERMISSOES,
  contarPermissoes,
  isOwner,
  permissoesPadrao,
  rotuloPapel,
} from "../config/security";
import { useAuth } from "../contexts/useAuth";
import { traduzirErro } from "../lib/mensagensErro";
import {
  acompanharUsuarios,
  atualizarUsuario,
  criarUsuario,
  revogarAcessoAdmin,
  salvarPermissoes,
} from "../services/userService";

const formularioInicial = {
  nome: "",
  email: "",
  senha: "",
  role: "admin",
};

function gerarSenhaTemporaria() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const aleatorios = new Uint32Array(10);
  crypto.getRandomValues(aleatorios);

  return Array.from(aleatorios, (valor) => alfabeto[valor % alfabeto.length]).join("");
}

// Pop-up de permissoes: serve tanto para o cadastro quanto para editar alguem
// que ja existe.
function ModalPermissoes({ titulo, descricao, valor, salvando, aoConfirmar, aoFechar }) {
  const [marcadas, setMarcadas] = useState(valor);

  function alternar(chave) {
    setMarcadas((atual) => ({ ...atual, [chave]: !atual[chave] }));
  }

  return (
    <div className="usage-overlay" role="dialog" aria-modal="true">
      <div className="usage-modal permissoes-modal">
        <div className="usage-header">
          <div>
            <span>Permissoes</span>
            <h2>{titulo}</h2>
          </div>

          <button
            type="button"
            className="close-modal"
            onClick={aoFechar}
            aria-label="Fechar permissoes"
          >
            <X size={18} />
          </button>
        </div>

        <p className="auth-note">
          <Shield size={15} />
          <span>{descricao}</span>
        </p>

        <div className="permissoes-grid">
          {PERMISSOES.map((grupo) => (
            <section key={grupo.grupo}>
              <h3>{grupo.grupo}</h3>

              {grupo.itens.map((item) => (
                <label className="permissao-item" key={item.chave}>
                  <input
                    type="checkbox"
                    checked={marcadas[item.chave] === true}
                    onChange={() => alternar(item.chave)}
                  />
                  <span>{item.titulo}</span>
                </label>
              ))}
            </section>
          ))}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={salvando}
            onClick={() => aoConfirmar(marcadas)}
          >
            <ShieldCheck size={16} />
            {salvando ? "Salvando..." : "Confirmar permissoes"}
          </button>

          <button type="button" className="btn-secondary" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaginaEquipe() {
  const { perfil, ehSuperAdmin, usuario } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [senhasVisiveis, setSenhasVisiveis] = useState({});
  const [cadastroPendente, setCadastroPendente] = useState(null);
  const [edicaoPermissoes, setEdicaoPermissoes] = useState(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!ehSuperAdmin) return undefined;

    return acompanharUsuarios(setUsuarios, (error) =>
      setErro(traduzirErro(error, "Nao foi possivel carregar a equipe.")),
    );
  }, [ehSuperAdmin]);

  if (!ehSuperAdmin) {
    return (
      <section className="tab-page">
        <div className="empty-state">
          <p>Somente Super Admins podem gerenciar a equipe.</p>
        </div>
      </section>
    );
  }

  // O cadastro nao grava direto: abre o pop-up de permissoes primeiro.
  function abrirPermissoesDoCadastro(evento) {
    evento.preventDefault();
    setErro("");
    setMensagem("");
    setCadastroPendente({
      nome: formulario.nome.trim(),
      email: formulario.email.trim(),
      senha: formulario.senha,
      role: formulario.role,
    });
  }

  async function confirmarCadastro(permissoes) {
    setSalvando(true);
    setErro("");

    try {
      await criarUsuario({ ...cadastroPendente, permissoes }, perfil);
      setMensagem(
        `${cadastroPendente.nome} foi cadastrado. Entregue a senha temporaria: ela sera trocada no primeiro acesso.`,
      );
      setFormulario(formularioInicial);
      setCadastroPendente(null);
    } catch (error) {
      setErro(traduzirErro(error, "Nao foi possivel cadastrar o usuario."));
      setCadastroPendente(null);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarEdicaoPermissoes(permissoes) {
    setSalvando(true);
    setErro("");

    try {
      await salvarPermissoes(
        edicaoPermissoes.uid,
        permissoes,
        perfil,
        edicaoPermissoes,
      );
      setMensagem(`Permissoes de ${edicaoPermissoes.nome} atualizadas.`);
      setEdicaoPermissoes(null);
    } catch (error) {
      setErro(traduzirErro(error, "Nao foi possivel salvar as permissoes."));
    } finally {
      setSalvando(false);
    }
  }

  async function executar(acao, alvo) {
    setErro("");
    setMensagem("");

    if (isOwner(alvo)) {
      setErro(OWNER_PROTECTED_MESSAGE);
      return;
    }

    if (alvo.uid === usuario?.uid) {
      setErro("Voce nao pode alterar o proprio acesso por aqui.");
      return;
    }

    try {
      await acao();
    } catch (error) {
      setErro(traduzirErro(error, "Nao foi possivel concluir a acao."));
    }
  }

  return (
    <section className="tab-page">
      <section className="form-container">
        <div className="form-title">
          <span>Equipe</span>
          <h2>Novo acesso administrativo</h2>
        </div>

        <form className="settings-form" onSubmit={abrirPermissoesDoCadastro}>
          <div className="form-row">
            <label>
              Nome completo
              <input
                type="text"
                required
                value={formulario.nome}
                onChange={(evento) =>
                  setFormulario({ ...formulario, nome: evento.target.value })
                }
              />
            </label>

            <label>
              E-mail
              <input
                type="email"
                required
                value={formulario.email}
                onChange={(evento) =>
                  setFormulario({ ...formulario, email: evento.target.value })
                }
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Senha temporaria
              <span className="password-field">
                <input
                  type="text"
                  required
                  minLength={6}
                  value={formulario.senha}
                  onChange={(evento) =>
                    setFormulario({ ...formulario, senha: evento.target.value })
                  }
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() =>
                    setFormulario({ ...formulario, senha: gerarSenhaTemporaria() })
                  }
                  title="Gerar senha temporaria"
                  aria-label="Gerar senha temporaria"
                >
                  <KeyRound size={16} />
                </button>
              </span>
            </label>

            <label>
              Perfil
              <select
                value={formulario.role}
                onChange={(evento) =>
                  setFormulario({ ...formulario, role: evento.target.value })
                }
              >
                <option value="admin">Professor (permissoes escolhidas)</option>
                <option value="superadmin">Super Admin (acesso total)</option>
              </select>
            </label>
          </div>

          {mensagem && <p className="form-hint">{mensagem}</p>}
          {erro && <p className="form-error">{erro}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              <UserPlus size={16} />
              Definir permissoes e cadastrar
            </button>
          </div>
        </form>
      </section>

      <section className="form-container">
        <div className="form-title">
          <span>{usuarios.length} pessoa(s) com acesso</span>
          <h2>Equipe administrativa</h2>
        </div>

        <div className="admin-panel-table equipe-table">
          <div className="admin-panel-row admin-panel-head">
            <span>Pessoa</span>
            <span>Perfil</span>
            <span>Permissoes</span>
            <span />
          </div>

          {usuarios.length === 0 && (
            <p className="admin-panel-empty">Nenhum acesso cadastrado ainda.</p>
          )}

          {usuarios.map((membro) => {
            const dono = isOwner(membro);
            const ativo = membro.active !== false;
            const superAdmin = membro.role === "superadmin";

            return (
              <div className="admin-panel-row" key={membro.uid}>
                <div>
                  <strong>
                    {dono && <Crown size={14} />}
                    {membro.nome || membro.name}
                  </strong>
                  <small>{membro.email}</small>

                  {membro.mustChangePassword && membro.temporaryPassword && (
                    <span className="senha-temporaria">
                      Senha temporaria:{" "}
                      <code>
                        {senhasVisiveis[membro.uid] ? membro.temporaryPassword : "••••••••"}
                      </code>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() =>
                          setSenhasVisiveis((atual) => ({
                            ...atual,
                            [membro.uid]: !atual[membro.uid],
                          }))
                        }
                        aria-label={
                          senhasVisiveis[membro.uid]
                            ? "Ocultar senha temporaria"
                            : "Mostrar senha temporaria"
                        }
                      >
                        {senhasVisiveis[membro.uid] ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </span>
                  )}
                </div>

                <div>
                  <span
                    className={
                      dono ? "role-tag owner" : superAdmin ? "role-tag super" : "role-tag"
                    }
                  >
                    {rotuloPapel(membro)}
                  </span>
                  {!ativo && <span className="role-tag off">Desativado</span>}
                </div>

                <div>
                  <small>
                    {dono || superAdmin
                      ? "Acesso total"
                      : `${contarPermissoes(membro)} permissao(oes)`}
                  </small>
                </div>

                <div className="admin-panel-actions">
                  {dono ? (
                    <small>Conta protegida</small>
                  ) : (
                    <>
                      {!superAdmin && (
                        <button
                          type="button"
                          className="icon-button edit"
                          title="Editar permissoes"
                          onClick={() =>
                            setEdicaoPermissoes({
                              ...membro,
                              permissoes: { ...permissoesPadrao(), ...(membro.permissoes || {}) },
                            })
                          }
                        >
                          <SlidersHorizontal size={16} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="icon-button"
                        title={superAdmin ? "Rebaixar para professor" : "Promover a Super Admin"}
                        onClick={() =>
                          executar(
                            () =>
                              atualizarUsuario(
                                membro.uid,
                                { role: superAdmin ? "admin" : "superadmin" },
                                perfil,
                                membro,
                              ),
                            membro,
                          )
                        }
                      >
                        <ShieldCheck size={16} />
                      </button>

                      <button
                        type="button"
                        className="icon-button"
                        title={ativo ? "Desativar acesso" : "Reativar acesso"}
                        onClick={() =>
                          executar(
                            () =>
                              atualizarUsuario(
                                membro.uid,
                                { active: !ativo },
                                perfil,
                                membro,
                              ),
                            membro,
                          )
                        }
                      >
                        <ShieldOff size={16} />
                      </button>

                      <button
                        type="button"
                        className="icon-button delete"
                        title="Revogar acesso administrativo"
                        onClick={() =>
                          executar(
                            () => revogarAcessoAdmin(membro.uid, perfil, membro),
                            membro,
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {cadastroPendente && (
        <ModalPermissoes
          titulo={`O que ${cadastroPendente.nome || "este usuario"} pode fazer`}
          descricao={
            cadastroPendente.role === "superadmin"
              ? "Super Admin tem acesso total: as marcacoes abaixo ficam apenas registradas."
              : "Marque o que este professor podera fazer. O que ficar desmarcado sera bloqueado no sistema."
          }
          valor={permissoesPadrao()}
          salvando={salvando}
          aoConfirmar={confirmarCadastro}
          aoFechar={() => setCadastroPendente(null)}
        />
      )}

      {edicaoPermissoes && (
        <ModalPermissoes
          titulo={`Permissoes de ${edicaoPermissoes.nome || edicaoPermissoes.email}`}
          descricao="Marque o que esta pessoa pode fazer. O que ficar desmarcado sera bloqueado no sistema."
          valor={edicaoPermissoes.permissoes}
          salvando={salvando}
          aoConfirmar={confirmarEdicaoPermissoes}
          aoFechar={() => setEdicaoPermissoes(null)}
        />
      )}
    </section>
  );
}
