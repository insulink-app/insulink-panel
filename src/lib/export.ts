// CSV serialisation and the browser download hand-off. Format-specific layouts
// live next door (see `clarity.ts`); this file only knows generic rows.

// Quote a cell only when it could break the row, doubling any inner quote.
// Nested values (a meal's `entries`) are kept as JSON rather than flattened —
// ponytail: one column of JSON beats a column explosion; flatten if a consumer
// ever needs the nested fields addressable.
function csvCell(value: unknown): string {
  if (value == null) {
    return "";
  }
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /["\n,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Columns are the union of every row's keys, so a field only some rows carry
// still gets one instead of being dropped with the first row that lacks it.
export function toCsv(rows: Record<string, unknown>[]): string {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const body = rows.map((row) =>
    headers.map((header) => csvCell(row[header])).join(","),
  );
  return [headers.join(","), ...body].join("\n");
}

// Excel reads a bare UTF-8 CSV as the system codepage and mangles "Müsli"; the
// BOM is what makes it pick UTF-8.
const UTF8_BOM = "﻿";

export function downloadCsv(filename: string, csv: string) {
  downloadText(filename, UTF8_BOM + csv, "text/csv");
}

export function downloadJson(filename: string, value: unknown) {
  downloadText(filename, JSON.stringify(value, null, 2), "application/json");
}

function downloadText(filename: string, text: string, mime: string) {
  downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }));
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
