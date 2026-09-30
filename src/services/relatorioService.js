import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  formatarAcao,
  formatarDataLog,
  formatarDescricaoLog,
  formatarEntidade,
} from "../lib/auditFormat";
import { nomePerfil } from "../config/security";

// Laranja da identidade visual, em RGB para o jsPDF.
const LARANJA = [233, 102, 18];
const CINZA_CLARO = [246, 248, 250];

function carimboArquivo() {
  return new Date().toISOString().slice(0, 10);
}

function agoraFormatado() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function montarCabecalho(doc, titulo, perfil, linhasExtras = []) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Storage SENAI", 14, 16);

  doc.setFontSize(13);
  doc.text(titulo, 14, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Emitido em: ${agoraFormatado()}`, 14, 33);
  doc.text(`Exportado por: ${nomePerfil(perfil)}`, 14, 39);

  linhasExtras.forEach((linha, indice) => {
    doc.text(linha, 14, 45 + indice * 6);
  });

  return 45 + linhasExtras.length * 6 + 7;
}

function numerarPaginas(doc) {
  const total = doc.getNumberOfPages();

  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina);
    doc.setFontSize(8);
    doc.text(
      `Storage SENAI - Pagina ${pagina} de ${total}`,
      14,
      doc.internal.pageSize.height - 8,
    );
  }
}

export function exportarLogsPdf(logs, filtros, perfil) {
  const doc = new jsPDF({ orientation: "landscape" });
  const inicioTabela = montarCabecalho(doc, "Relatorio de Auditoria", perfil, [
    `Filtros: acao=${filtros.acao === "Todos" ? "Todas" : formatarAcao(filtros.acao)}; entidade=${
      filtros.entidade === "Todos" ? "Todas" : formatarEntidade(filtros.entidade)
    }; usuario=${filtros.usuario}; periodo=${filtros.dataInicial || "-"} ate ${
      filtros.dataFinal || "-"
    }`,
    `Total de registros: ${logs.length}`,
  ]);

  autoTable(doc, {
    startY: inicioTabela,
    head: [["Data", "Usuario", "Perfil", "Acao", "Entidade", "Descricao"]],
    body: logs.map((log) => [
      formatarDataLog(log.createdAt),
      log.userName || log.userEmail || "-",
      log.userRole || "-",
      formatarAcao(log.action),
      formatarEntidade(log.entity),
      formatarDescricaoLog(log),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: LARANJA },
    alternateRowStyles: { fillColor: CINZA_CLARO },
  });

  numerarPaginas(doc);
  doc.save(`auditoria-storage-senai-${carimboArquivo()}.pdf`);
}

// Uma linha por produto, com os saldos dos dois estoques lado a lado.
function montarLinhasEstoque(produtos) {
  return produtos.map((produto) => ({
    Codigo: produto.codigo || "",
    Produto: produto.nome || "",
    Fornecedor: produto.fornecedor || "",
    Descricao: produto.descricao || "",
    "Estoque principal": Number(produto.quantidadeKg || 0),
    "Estoque pequeno": Number(produto.quantidadePequeno || 0),
    Total: Number(produto.quantidadeKg || 0) + Number(produto.quantidadePequeno || 0),
    Unidade: produto.unidade || "kg",
    "Repor ate": Number(produto.limiteReposicao ?? ""),
    "Atencao ate": Number(produto.limiteAtencao ?? ""),
  }));
}

export function exportarEstoquePlanilha(produtos, perfil) {
  const linhas = montarLinhasEstoque(produtos);
  const planilha = XLSX.utils.json_to_sheet(linhas);

  planilha["!cols"] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 20 },
    { wch: 32 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
  ];

  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, planilha, "Estoque");

  const resumo = XLSX.utils.json_to_sheet([
    { Campo: "Emitido em", Valor: agoraFormatado() },
    { Campo: "Exportado por", Valor: nomePerfil(perfil) },
    { Campo: "Itens", Valor: linhas.length },
    {
      Campo: "Total no estoque principal",
      Valor: linhas.reduce((soma, linha) => soma + linha["Estoque principal"], 0),
    },
    {
      Campo: "Total no estoque pequeno",
      Valor: linhas.reduce((soma, linha) => soma + linha["Estoque pequeno"], 0),
    },
  ]);
  XLSX.utils.book_append_sheet(pasta, resumo, "Resumo");

  XLSX.writeFile(pasta, `estoque-storage-senai-${carimboArquivo()}.xlsx`);
}

export function exportarEstoquePdf(produtos, perfil) {
  const doc = new jsPDF({ orientation: "landscape" });
  const linhas = montarLinhasEstoque(produtos);
  const totalPrincipal = linhas.reduce((soma, linha) => soma + linha["Estoque principal"], 0);
  const totalPequeno = linhas.reduce((soma, linha) => soma + linha["Estoque pequeno"], 0);

  const inicioTabela = montarCabecalho(doc, "Relatorio de Estoque", perfil, [
    `Itens: ${linhas.length}`,
    `Total no pavilhao: ${totalPrincipal} | Total nos baldes: ${totalPequeno}`,
  ]);

  autoTable(doc, {
    startY: inicioTabela,
    head: [
      [
        "Codigo",
        "Produto",
        "Fornecedor",
        "Principal",
        "Pequeno",
        "Total",
        "Un.",
        "Repor ate",
      ],
    ],
    body: linhas.map((linha) => [
      linha.Codigo,
      linha.Produto,
      linha.Fornecedor,
      linha["Estoque principal"],
      linha["Estoque pequeno"],
      linha.Total,
      linha.Unidade,
      linha["Repor ate"],
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: LARANJA },
    alternateRowStyles: { fillColor: CINZA_CLARO },
  });

  numerarPaginas(doc);
  doc.save(`estoque-storage-senai-${carimboArquivo()}.pdf`);
}
