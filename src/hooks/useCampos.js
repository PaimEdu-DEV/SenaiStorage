import { useEffect, useMemo, useState } from "react";
import { campoEhVisivelPara, mesclarCampos } from "../config/campos";
import { acompanharCampos } from "../services/camposService";

// Entrega os campos de um contexto ja mesclados (sistema + personalizados),
// ordenados e filtrados pela visibilidade de quem esta olhando.
export function useCampos(contexto, { ehAdmin = false } = {}) {
  const [salvos, setSalvos] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => acompanharCampos(setSalvos, (error) => setErro(error.message)), []);

  const todos = useMemo(() => mesclarCampos(salvos, contexto), [salvos, contexto]);

  const visiveis = useMemo(
    () => todos.filter((campo) => campoEhVisivelPara(campo, ehAdmin)),
    [todos, ehAdmin],
  );

  const personalizados = useMemo(
    () => visiveis.filter((campo) => !campo.sistema),
    [visiveis],
  );

  return { todos, visiveis, personalizados, erro };
}
