// Traduz os erros do Firebase (sempre em ingles) para mensagens que o usuario
// do sistema entenda. Erros que o proprio sistema lanca ja vem em portugues e
// passam direto.

const POR_CODIGO = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/invalid-login-credentials": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "Nao existe conta cadastrada com este e-mail.",
  "auth/invalid-email": "O e-mail informado nao e valido.",
  "auth/user-disabled": "Esta conta foi desativada no Firebase.",
  "auth/email-already-in-use": "Este e-mail ja esta em uso por outra conta.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/missing-password": "Informe a senha.",
  "auth/too-many-requests":
    "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
  "auth/network-request-failed":
    "Sem conexao com o servidor. Verifique sua internet.",
  "auth/requires-recent-login":
    "Por seguranca, entre novamente antes de alterar a senha.",
  "auth/operation-not-allowed":
    "O login por e-mail e senha nao esta ativado no Console do Firebase.",
  "permission-denied":
    "Acesso negado pelas regras do Firestore. Publique as regras atualizadas do projeto e tente de novo.",
  unauthenticated: "Sua sessao expirou. Entre novamente.",
  unavailable:
    "O Firestore esta indisponivel no momento. Tente novamente em instantes.",
  "deadline-exceeded": "O servidor demorou demais para responder.",
  "not-found": "O registro procurado nao existe mais.",
  "already-exists": "Este registro ja existe.",
};

// Alguns erros chegam sem codigo, so com o texto em ingles.
const POR_TEXTO = [
  [
    "missing or insufficient permissions",
    "Acesso negado pelas regras do Firestore. Publique as regras atualizadas do projeto e tente de novo.",
  ],
  ["network error", "Sem conexao com o servidor. Verifique sua internet."],
  ["quota exceeded", "O limite de uso do Firebase foi atingido."],
];

export function traduzirErro(error, padrao = "Nao foi possivel concluir a acao.") {
  if (!error) return padrao;

  const codigo = error.code;
  if (codigo && POR_CODIGO[codigo]) return POR_CODIGO[codigo];

  // Codigos do Firestore chegam como "firestore/permission-denied" em alguns SDKs.
  if (codigo) {
    const sufixo = String(codigo).split("/").pop();
    if (POR_CODIGO[sufixo]) return POR_CODIGO[sufixo];
  }

  const texto = String(error.message || "");
  const correspondencia = POR_TEXTO.find(([trecho]) =>
    texto.toLowerCase().includes(trecho),
  );
  if (correspondencia) return correspondencia[1];

  // Mensagem do proprio sistema: ja esta em portugues.
  if (texto && !/^Firebase:/i.test(texto)) return texto;

  return padrao;
}
