import { Pencil, Trash2 } from "lucide-react";

// Botoes de editar e excluir de um produto. Sem a permissao o botao nao
// aparece: quem nao pode nem chega a tentar.
export default function AcoesProduto({
  produto,
  podeEditar,
  podeExcluir,
  aoEditar,
  aoExcluir,
}) {
  if (!podeEditar && !podeExcluir) {
    return <span className="read-only-note compact">Consulta</span>;
  }

  return (
    <>
      {podeEditar && (
        <button
          type="button"
          className="icon-button edit"
          onClick={() => aoEditar(produto)}
          aria-label={`Editar ${produto.nome}`}
          title="Editar"
        >
          <Pencil size={20} />
        </button>
      )}

      {podeExcluir && (
        <button
          type="button"
          className="icon-button delete"
          onClick={() => aoExcluir(produto.id)}
          aria-label={`Excluir ${produto.nome}`}
          title="Excluir"
        >
          <Trash2 size={20} />
        </button>
      )}
    </>
  );
}
