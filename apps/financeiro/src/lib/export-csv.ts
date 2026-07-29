/**
 * CSV real, extensão real. Não gera XLSX — apenas texto delimitado por
 * vírgula com BOM UTF-8, então o nome do arquivo baixado é sempre `.csv`.
 * Quem precisa de planilha de verdade usa a exportação de Demonstrativos
 * (actions/reports.ts, exceljs no servidor).
 */
const BOM = "﻿";

export function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function downloadCsv(
  fileName: string,
  header: string[],
  rows: string[][],
): void {
  const body = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([BOM + header.join(",") + "\n" + body], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
