# Storage SENAI

Sistema de controle de estoque de materiais para as aulas: cadastro de
materiais, saldo do pavilhão e dos baldes, registro de uso em aula,
justificativas, auditoria e backups.

React + Vite no front, Firebase (Authentication + Firestore) no back.

---

## Rodar na sua máquina

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173/`. Não existe arquivo `.env`: as credenciais do
Firebase são públicas por natureza (rodam no navegador de qualquer visitante) e
estão em `src/firebaseconfig.js`. Quem protege o banco são as regras do
Firestore, não essas chaves.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | Oxlint |
| `npm run regras` | Publica `firestore.rules` no projeto do Firebase |
| `npm run emuladores` | Sobe Auth + Firestore locais, com painel em `localhost:4000` |

---

## Firebase

O projeto usa o Firebase **`senaistorage`**. Dois arquivos amarram o código a ele:

- `src/firebaseconfig.js` — as credenciais que o navegador usa
- `.firebaserc` — qual projeto o CLI publica as regras

### Para obter acesso

Peça ao dono do projeto para te adicionar no Console do Firebase:
⚙️ → *Usuários e permissões* → **Adicionar membro** → seu e-mail → papel
**Editor**. Depois, autentique o CLI uma vez:

```bash
npx --yes firebase-tools login
```

### O que já está configurado no Console

- **Authentication** → provedor E-mail/senha ativado
- **Firestore** → banco `(default)`, modo Native, região `southamerica-east1`
- **Regras** → publicadas a partir de `firestore.rules` deste repositório

---

## Regras do Firestore — leia antes de mexer

As regras são versionadas em `firestore.rules`. O ciclo é:

```bash
# 1. edite firestore.rules
# 2. teste no emulador
npm run emuladores
# 3. publique
npm run regras
```

**Nunca edite as regras pelo Console.** Se editar lá, o que está publicado passa
a divergir do que está no Git, e o próximo `npm run regras` sobrescreve a
alteração sem avisar.

### Duas armadilhas que já custaram tempo

**Campo ausente derruba a regra inteira.** No Firestore, ler um campo que não
existe no documento não retorna vazio: a avaliação falha e o acesso é negado.
Por isso toda leitura usa valor padrão:

```js
dadosAdmin().get('adminAccessRevoked', false) != true
```

**Regra circular trava o primeiro acesso.** A leitura de `admins` precisa
permitir que o usuário leia o *próprio* documento, senão o primeiro login
nunca consegue criar a conta raiz:

```js
allow read: if ehAdmin() || (autenticado() && request.auth.uid == adminId);
```

---

## Papéis e permissões

Três níveis, definidos em `src/config/security.js`:

| Papel | O que pode |
| --- | --- |
| `owner` | Tudo. Conta raiz, protegida contra remoção, desativação e troca de papel |
| `superadmin` | Tudo, menos mexer no Owner. Gerencia equipe, campos e backups |
| `admin` | Apenas as permissões marcadas para ele no painel de Equipe |

Professores comuns recebem permissões granulares (cadastrar, editar, excluir
produtos, movimentar estoque, ver auditoria, exportar relatórios...). Botões de
ações sem permissão não são renderizados.

> ⚠️ **Importante para quem assume o projeto:** o e-mail do Owner está fixo em
> `src/config/security.js`. Enquanto for o e-mail do dono anterior, ninguém
> mais consegue remover ou rebaixar aquela conta — nem um Super Admin, nem o
> dono do projeto no Console, porque a proteção está no código e nas regras.
> Para assumir de verdade, troque esse e-mail pelo seu e faça o primeiro login:
> a conta raiz é criada com a senha que você digitar.

### Primeiro acesso

Não existe senha semente. O primeiro login com o e-mail configurado em
`OWNER_EMAIL` cria a conta de Owner usando a senha digitada ali.

---

## Estrutura

```
src/
  App.jsx                 Tela principal: abas, estoque, registro de uso
  crud.js                 Leituras e escritas das coleções de estoque
  firebaseconfig.js       Credenciais e app secundário para criar usuários
  config/
    security.js           Papéis, permissões e o Owner
    campos.js             Registro de campos (sistema + personalizados)
  services/               userService, backupService, auditService, camposService...
  components/             Modais, páginas de Equipe, Auditoria, Produtos
  hooks/useCampos.js      Junta campos de sistema com os criados pelo admin
firestore.rules           Regras de segurança (versionadas)
```

### Coleções no Firestore

`produtos`, `produtosFinais`, `historicoMovimentacoes`, `justificativas`,
`linksAcesso`, `configuracoes`, `admins`, `logs`, `backups`,
`camposPersonalizados`, `systemProtection`.

Um produto é **um único documento**: `quantidadeKg` é o saldo do pavilhão e
`quantidadePequeno` o dos baldes. A lista de baldes na tela é uma visão
derivada — não existe um segundo documento para o mesmo material.

---

## Backups

O painel de Backups (Super Admin) gera um snapshot de todas as coleções, com
download em JSON. Backups automáticos rodam nos dias 1 e 15, às 03:00 de
Brasília, enquanto o painel estiver aberto, com retenção de 7 diários e 12
mensais. Restaurar é exclusivo do Owner, e sempre cria um backup de segurança
antes.

Há um modo de proteção: se alguma coleção cair abaixo de metade do último
backup válido, novos backups são suspensos para preservar o que existe. Só o
Owner pode ignorar, por 10 minutos.

---

## Pontos de atenção conhecidos

- **Campos "internos" não são secretos.** A coleção `produtos` é de leitura
  pública (o aluno consulta o estoque sem login), então um campo marcado como
  oculto some da interface, mas o valor ainda chega ao navegador. Para esconder
  de verdade, esses valores precisam ir para uma subcoleção protegida por regra.
- **Permissões são aplicadas no cliente.** As regras do Firestore distinguem
  aluno, admin, super admin e owner, mas não leem as permissões granulares. Um
  professor sem "excluir produtos" não consegue excluir pela interface; uma
  escrita feita por fora passaria.
- **Migrar de projeto não leva as contas.** O Authentication vive fora do
  Firestore. Trocar de projeto Firebase exige recadastrar os professores, cada
  um com nova senha temporária. Os dados do estoque atravessam pelo backup JSON.
