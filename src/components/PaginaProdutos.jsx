import { ImagePlus, PackagePlus, Pencil, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { podeFazer } from "../config/security";
import { useAuth } from "../contexts/useAuth";
import {
  cadastrarProdutoFinal,
  excluirProdutoFinal,
  listarProdutosFinais,
} from "../crud";
import { converterImagemParaWebp } from "../lib/imagem";
import { traduzirErro } from "../lib/mensagensErro";
import { criarLogAuditoria } from "../services/auditService";

const formularioInicial = {
  id: "",
  nome: "",
  descricao: "",
  foto: "",
  fotoNome: "",
  fotoTamanhoKb: "",
};

function formatarData(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("pt-BR");
}

export default function PaginaProdutos({ aoPedirConfirmacao }) {
  const { perfil, ehAdmin } = useAuth();
  const [produtosFinais, setProdutosFinais] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Aluno ve a vitrine; escrever depende da permissao de produtos.
  const podeCriar = ehAdmin && podeFazer(perfil, "produtos.criar");
  const podeEditar = ehAdmin && podeFazer(perfil, "produtos.editar");
  const podeExcluir = ehAdmin && podeFazer(perfil, "produtos.excluir");

  useEffect(
    () =>
      listarProdutosFinais(setProdutosFinais, (error) =>
        setErro(traduzirErro(error, "Nao foi possivel carregar os produtos.")),
      ),
    [],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtosFinais;

    return produtosFinais.filter((produto) =>
      `${produto.nome || ""} ${produto.descricao || ""}`.toLowerCase().includes(termo),
    );
  }, [produtosFinais, busca]);

  function abrirCadastro() {
    setFormulario(formularioInicial);
    setErro("");
    setModalAberto(true);
  }

  function abrirEdicao(produto) {
    setFormulario({
      id: produto.id,
      nome: produto.nome || "",
      descricao: produto.descricao || "",
      foto: produto.foto || "",
      fotoNome: produto.fotoNome || "",
      fotoTamanhoKb: produto.fotoTamanhoKb || "",
    });
    setErro("");
    setModalAberto(true);
  }

  async function trocarFoto(evento) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setErro("");
    try {
      const convertida = await converterImagemParaWebp(arquivo);
      setFormulario((atual) => ({
        ...atual,
        foto: convertida.imagemWebp,
        fotoNome: convertida.nome,
        fotoTamanhoKb: convertida.tamanhoKb,
      }));
    } catch (error) {
      setErro(traduzirErro(error));
    }
  }

  async function salvar(evento) {
    evento.preventDefault();
    setErro("");

    if (!formulario.nome.trim()) {
      setErro("Informe o nome do produto.");
      return;
    }

    const edicao = Boolean(formulario.id);
    if (edicao ? !podeEditar : !podeCriar) {
      setErro(
        edicao
          ? "Voce nao tem permissao para editar produtos."
          : "Voce nao tem permissao para cadastrar produtos.",
      );
      return;
    }

    setSalvando(true);
    try {
      const registro = {
        id: formulario.id || crypto.randomUUID(),
        nome: formulario.nome.trim(),
        descricao: formulario.descricao.trim(),
        foto: formulario.foto,
        fotoNome: formulario.fotoNome,
        fotoTamanhoKb: formulario.fotoTamanhoKb,
        criadoEm: formulario.id ? undefined : Date.now(),
        atualizadoEm: Date.now(),
      };

      // criadoEm so entra no cadastro, para nao sobrescrever a data original.
      if (registro.criadoEm === undefined) delete registro.criadoEm;

      await cadastrarProdutoFinal(registro);
      await criarLogAuditoria(perfil, {
        action: edicao ? "UPDATE" : "CREATE",
        entity: "produto",
        entityId: registro.id,
        description: `Produto '${registro.nome}' foi ${edicao ? "atualizado" : "cadastrado"} na vitrine.`,
        after: { nome: registro.nome, descricao: registro.descricao },
      }).catch(() => {});

      setFormulario(formularioInicial);
      setModalAberto(false);
    } catch (error) {
      setErro(traduzirErro(error));
    } finally {
      setSalvando(false);
    }
  }

  function remover(produto) {
    if (!podeExcluir) {
      setErro("Voce nao tem permissao para excluir produtos.");
      return;
    }

    aoPedirConfirmacao({
      titulo: "Excluir produto",
      descricao: `${produto.nome} sera removido da vitrine. Esta acao nao pode ser desfeita.`,
      rotuloAcao: "Excluir produto",
      aoConfirmar: async () => {
        try {
          await excluirProdutoFinal(produto.id);
          await criarLogAuditoria(perfil, {
            action: "DELETE",
            entity: "produto",
            entityId: produto.id,
            description: `Produto '${produto.nome}' foi excluido da vitrine.`,
            before: { nome: produto.nome },
          }).catch(() => {});
        } catch (error) {
          setErro(traduzirErro(error));
        }
      },
    });
  }

  return (
    <section className="tab-page products-container">
      <div className="products-header">
        <div>
          <h2>Produtos</h2>
          <span>
            {produtosFinais.length} produto(s) que podem ser feitos em aula
          </span>
        </div>

        {podeCriar ? (
          <button type="button" className="btn-primary" onClick={abrirCadastro}>
            <PackagePlus size={18} />
            Novo produto
          </button>
        ) : (
          <span className="read-only-note">
            {ehAdmin ? "Somente consulta" : "Visualizacao do aluno"}
          </span>
        )}
      </div>

      <div className="inline-filter-bar filtro-sem-botao">
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="usage-search"
            placeholder="Buscar por nome ou descricao..."
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </div>
      </div>

      {erro && <p className="form-error">{erro}</p>}

        {filtrados.length === 0 ? (
          <div className="empty-state empty-state-boxed">
            <PackagePlus size={28} />
            <p>
              {produtosFinais.length === 0
                ? "Nenhum produto cadastrado ainda."
                : "Nenhum produto encontrado para esta busca."}
            </p>
          </div>
        ) : (
          <div className="produtos-grid">
            {filtrados.map((produto) => (
              <article className="produto-card" key={produto.id}>
                <div className="produto-foto">
                  {produto.foto ? (
                    <img src={produto.foto} alt={produto.nome} loading="lazy" />
                  ) : (
                    <ImagePlus size={26} />
                  )}
                </div>

                <div className="produto-corpo">
                  <strong>{produto.nome}</strong>
                  <p>{produto.descricao || "Sem descricao."}</p>
                  {produto.criadoEm && (
                    <small>Cadastrado em {formatarData(produto.criadoEm)}</small>
                  )}
                </div>

                {(podeEditar || podeExcluir) && (
                  <div className="produto-acoes">
                    {podeEditar && (
                      <button
                        type="button"
                        className="icon-button edit"
                        onClick={() => abrirEdicao(produto)}
                        title={`Editar ${produto.nome}`}
                        aria-label={`Editar ${produto.nome}`}
                      >
                        <Pencil size={16} />
                      </button>
                    )}

                    {podeExcluir && (
                      <button
                        type="button"
                        className="icon-button delete"
                        onClick={() => remover(produto)}
                        title={`Excluir ${produto.nome}`}
                        aria-label={`Excluir ${produto.nome}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

      {modalAberto && (
        <div className="usage-overlay" role="dialog" aria-modal="true">
          <div className="usage-modal auth-modal">
            <div className="usage-header">
              <div>
                <span>Catalogo</span>
                <h2>{formulario.id ? "Editar produto" : "Novo produto"}</h2>
              </div>

              <button
                type="button"
                className="close-modal"
                onClick={() => setModalAberto(false)}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form className="auth-form" onSubmit={salvar}>
              <label>
                Nome
                <input
                  type="text"
                  required
                  maxLength={60}
                  placeholder="Ex: Chaveiro"
                  value={formulario.nome}
                  onChange={(evento) =>
                    setFormulario({ ...formulario, nome: evento.target.value })
                  }
                />
              </label>

              <label>
                Descricao
                <textarea
                  maxLength={300}
                  placeholder="Para que serve, material usado, observacoes..."
                  value={formulario.descricao}
                  onChange={(evento) =>
                    setFormulario({ ...formulario, descricao: evento.target.value })
                  }
                />
              </label>

              <label>
                Foto do produto
                <input type="file" accept="image/*" onChange={trocarFoto} />
              </label>

              {formulario.foto && (
                <div className="produto-previa">
                  <img src={formulario.foto} alt="Previa do produto" />
                  <small>
                    {formulario.fotoNome} - {formulario.fotoTamanhoKb} KB
                  </small>
                </div>
              )}

              {erro && <p className="form-error">{erro}</p>}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={salvando}>
                  <PackagePlus size={16} />
                  {salvando ? "Salvando..." : formulario.id ? "Salvar" : "Cadastrar"}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
