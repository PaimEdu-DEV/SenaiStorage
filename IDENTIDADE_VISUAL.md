# Identidade Visual - Storage SENAI

## Direcao

Interface de monitoramento industrial, centrada em materiais, saldos e atividade.
O laranja identifica a marca e as acoes; os neutros estruturam a leitura.
Paginas usam secoes abertas, com bordas discretas em tabelas e itens repetidos.

## Cores

| Papel | Claro | Escuro |
| --- | --- | --- |
| Fundo | #f5f6f8 | #131517 |
| Superficie | #ffffff | #1b1e21 |
| Texto | #20252d | #eff1f4 |
| Texto secundario | #68717e | #a4adb7 |
| Borda | #dfe3e9 | #383e44 |
| Destaque laranja | #e96612 | #ff963f |
| Disponibilidade | #18745d | #72c7ac |
| Atencao | #956114 | #ebc47a |
| Erro/reposicao | #c23737 | #ff9690 |
| Estoque Pequeno | #278b86 | #6dc3bd |

A marca preserva o laranja #f47b20. Botoes principais usam #e96612 com texto branco.
Estados combinam texto e cor. A logo SENAI fica branca no tema escuro.

## Tipografia e espacamento

- Segoe UI com alternativas locais, sem download de fontes.
- Titulos de 20 a 28px; texto de interface de 12 a 14px.
- Numeros de estoque usam algarismos tabulares.
- Espacamentos de 4, 8, 12, 16, 20, 24 e 32px.
- Raios entre 4 e 8px. Sem sombras decorativas nas secoes.
- Espacamento entre letras igual a zero.

## Navegacao

Menu lateral fixo e recolhivel. No celular, inicia recolhido.
A seta expande a navegacao. Tema e perfil ficam no rodape do menu.
A cabecalho identifica a area atual. O conteudo ocupa a largura disponivel.

## Painel

Graficos de meia-lua preservam os calculos existentes: o percentual compara
o volume ao maior estoque, nao a uma capacidade maxima configurada.
Quantidades sempre exibem a unidade. Indicadores de materiais e reposicao
ficam separados dos volumes. O professor ve as cinco movimentacoes mais recentes.

## Tabelas e estoques

Nome, codigo, fornecedor, quantidade e acoes seguem uma grade comum.
Em telas menores, as linhas reorganizam seus campos com rotulos individuais.
Codigos longos quebram linha sem esconder informacoes.
O saldo do pavilhao e o dos baldes continuam separados no mesmo item.

## Formularios

Campos de linha unica tem 44px de altura. Textareas crescem verticalmente.
As secoes alinham o conteudo no topo, sem esticar campos para preencher espaco.
Foco usa contorno laranja. Arquivos, radios e caixas de selecao tem dimensoes proprias.

## Modais

Titulo e fechamento permanecem visiveis ao rolar.
A altura respeita a janela, sem rolagem horizontal.
Animacoes de 180ms respeitam a preferencia por movimento reduzido.
Cadastrar, registrar uso, justificar e gerar links preservam os fluxos existentes.

## Arquivos

- src/index.css: reset minimo, sem estilos de componentes.
- src/App.css: tokens, componentes e responsividade em uma unica base.
- src/App.jsx: estrutura da interface e fluxos existentes.
