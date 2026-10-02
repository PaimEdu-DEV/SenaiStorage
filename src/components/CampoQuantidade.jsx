// Campo de quantidade com a unidade ao lado. Cada quantidade da aula pode
// ser anotada na unidade que o aluno mediu: 1 kg retirado, 500 g em produto.
export default function CampoQuantidade({
  rotulo,
  valor,
  unidade,
  unidades,
  unidadeBase,
  equivalente,
  placeholder = "0",
  aoMudarValor,
  aoMudarUnidade,
}) {
  const mostrarEquivalente =
    unidade !== unidadeBase && Number(valor || 0) > 0 && equivalente !== undefined;

  return (
    <label>
      {rotulo}

      <span className="quantidade-com-unidade">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder={placeholder}
          value={valor}
          onChange={(evento) => aoMudarValor(evento.target.value)}
        />

        <select
          value={unidade}
          aria-label={`Unidade de ${rotulo}`}
          onChange={(evento) => aoMudarUnidade(evento.target.value)}
        >
          {unidades.map((item) => (
            <option value={item.id} key={item.id}>
              {item.titulo}
            </option>
          ))}
        </select>
      </span>

      {mostrarEquivalente && (
        <span className="field-hint">
          = {equivalente} {unidadeBase}
        </span>
      )}
    </label>
  );
}
