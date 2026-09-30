// As fotos vao para o Firestore como data URL, entao precisam ser reduzidas
// e convertidas antes de salvar.
export function converterImagemParaWebp(arquivo, larguraMaxima = 800, qualidade = 0.78) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    const urlTemporaria = URL.createObjectURL(arquivo);

    imagem.onload = () => {
      const proporcao = Math.min(1, larguraMaxima / imagem.width);
      const largura = Math.round(imagem.width * proporcao);
      const altura = Math.round(imagem.height * proporcao);
      const canvas = document.createElement("canvas");
      const contexto = canvas.getContext("2d");

      canvas.width = largura;
      canvas.height = altura;
      contexto.drawImage(imagem, 0, 0, largura, altura);

      const imagemWebp = canvas.toDataURL("image/webp", qualidade);
      const tamanhoKb = Math.round((imagemWebp.length * 3) / 4 / 1024);

      URL.revokeObjectURL(urlTemporaria);
      resolve({
        imagemWebp,
        tamanhoKb,
        nome: arquivo.name.replace(/\.[^.]+$/, ".webp"),
      });
    };

    imagem.onerror = () => {
      URL.revokeObjectURL(urlTemporaria);
      reject(new Error("Nao foi possivel converter a imagem para WebP."));
    };

    imagem.src = urlTemporaria;
  });
}
