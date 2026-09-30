import {
  Crown,
  KeyRound,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { OWNER_PROTECTED_MESSAGE, isOwner, rotuloPapel } from "../config/security";
import { useAuth } from "../contexts/useAuth";
import { traduzirErro } from "../lib/mensagensErro";
import {
  acompanharUsuarios,
  atualizarUsuario,
  criarUsuario,
  revogarAcessoAdmin,
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

export default function PainelUsuarios() {
  const { perfil, ehSuperAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!ehSuperAdmin) return undefined;

    return acompanharUsuarios(setUsuarios, (error) =>
      setErro(traduzirErro(error, "Nao foi possivel carregar os usuarios.")),
    );
  }, [ehSuperAdmin]);

  if (!ehSuperAdmin) return null;

  async function cadastrar(evento) {
    evento.preventDefault();
    setErro("");
    setMensagem("");
    setSalvando(true);

    try {
      await criarUsuario(
        {
          nome: formulario.nome.trim(),
          email: formulario.email.trim(),
          senha: formulario.senha,
          role: formulario.role,
        },
        perfil,
      );
      setMensagem(
        `Usuario criado. Entregue a senha temporaria "${formulario.senha}" ao novo usuario: ele sera obrigado a troca-la no primeiro acesso.`,
      );
      setFormulario(formularioInicial);
    } catch (error) {
      setErro(traduzirErro(error, "Nao foi possivel cadastrar o usuario."));
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

    try {
      await acao();
    } catch (error) {
      setErro(traduzirErro(error, "Nao foi possivel concluir a acao."));
    }
  }

  return (
    <article className="settings-card settings-card-wide">
      <div className="settings-card-title">
        <Users size={20} />
        <strong>Usuarios do sistema</strong>
      </div>

      <p>
        Somente Super Admins cadastram novos acessos. O usuario recebe uma senha
        temporaria e e obrigado a definir a propria senha no primeiro acesso.
      </p>

      <form className="settings-form" onSubmit={cadastrar}>
        <div className="form-row">
          <label>
            Nome
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
              <option value="admin">Professor (admin)</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </label>
        </div>

        {mensagem && <p className="form-hint">{mensagem}</p>}
        {erro && <p className="form-error">{erro}</p>}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={salvando}>
            <UserPlus size={16} />
            {salvando ? "Cadastrando..." : "Cadastrar usuario"}
          </button>
        </div>
      </form>

      <div className="admin-panel-table">
        <div className="admin-panel-row admin-panel-head">
          <span>Usuario</span>
          <span>Perfil</span>
          <span>Situacao</span>
          <span />
        </div>

        {usuarios.length === 0 && (
          <p className="admin-panel-empty">Nenhum usuario cadastrado ainda.</p>
        )}

        {usuarios.map((usuario) => {
          const dono = isOwner(usuario);
          const ativo = usuario.active !== false;

          return (
            <div className="admin-panel-row" key={usuario.uid}>
              <div>
                <strong>
                  {dono && <Crown size={14} />}
                  {usuario.nome || usuario.name}
                </strong>
                <small>{usuario.email}</small>
              </div>

              <div>
                <span
                  className={
                    dono
                      ? "role-tag owner"
                      : usuario.role === "superadmin"
                        ? "role-tag super"
                        : "role-tag"
                  }
                >
                  {rotuloPapel(usuario)}
                </span>
              </div>

              <div>
                <span
                  className={
                    usuario.mustChangePassword
                      ? "role-tag pending"
                      : ativo
                        ? "role-tag super"
                        : "role-tag off"
                  }
                >
                  {usuario.mustChangePassword
                    ? "Senha temporaria"
                    : ativo
                      ? "Ativo"
                      : "Desativado"}
                </span>
              </div>

              <div className="admin-panel-actions">
                {dono ? (
                  <small>Conta protegida</small>
                ) : (
                  <>
                    <button
                      type="button"
                      className="icon-button edit"
                      title={
                        usuario.role === "superadmin"
                          ? "Rebaixar para professor"
                          : "Promover a Super Admin"
                      }
                      onClick={() =>
                        executar(
                          () =>
                            atualizarUsuario(
                              usuario.uid,
                              {
                                role:
                                  usuario.role === "superadmin" ? "admin" : "superadmin",
                              },
                              perfil,
                              usuario,
                            ),
                          usuario,
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
                              usuario.uid,
                              { active: !ativo },
                              perfil,
                              usuario,
                            ),
                          usuario,
                        )
                      }
                    >
                      <ShieldOff size={16} />
                    </button>

                    <button
                      type="button"
                      className="icon-button delete"
                      title="Revogar acesso administrativo"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Revogar o acesso administrativo de ${usuario.nome || usuario.email}?`,
                          )
                        ) {
                          return;
                        }

                        executar(
                          () => revogarAcessoAdmin(usuario.uid, perfil, usuario),
                          usuario,
                        );
                      }}
                    >
                      <ShieldOff size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
