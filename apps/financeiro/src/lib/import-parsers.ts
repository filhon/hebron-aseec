// ---------------------------------------------------------------------------
// OFX / CSV parsers (pure functions — no side effects)
//
// Extracted from actions/import.ts (P-3.9): a "use server" module can only
// export async functions — next build rejects sync exports like these, even
// though dev/tests never caught it. Kept here so actions/import.ts and
// __tests__/csv-parser.test.ts both import the same pure implementation.
// ---------------------------------------------------------------------------

export interface ParsedImportRow {
  date: string; // YYYY-MM-DD
  amount: number; // positive = credit, negative = debit
  description: string;
}

function parseOFX(content: string): ParsedImportRow[] {
  const rows: ParsedImportRow[] = [];
  // OFX SGML: <STMTTRN>...</STMTTRN> blocks
  const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  while ((match = txRegex.exec(content)) !== null) {
    const block = match[1] ?? "";

    const getField = (tag: string): string | null => {
      const m = new RegExp(`<${tag}>([^<\r\n]+)`, "i").exec(block);
      return m?.[1]?.trim() ?? null;
    };

    const dtPosted = getField("DTPOSTED");
    const trnAmt = getField("TRNAMT");
    const memo = getField("MEMO") ?? getField("NAME") ?? "";

    if (!dtPosted || !trnAmt) continue;

    // YYYYMMDD[HH[MM[SS]]] → YYYY-MM-DD
    const year = dtPosted.slice(0, 4);
    const month = dtPosted.slice(4, 6);
    const day = dtPosted.slice(6, 8);
    const dateStr = `${year}-${month}-${day}`;

    const amount = parseFloat(trnAmt.replace(",", "."));
    if (isNaN(amount)) continue;

    rows.push({ date: dateStr, amount, description: memo });
  }
  return rows;
}

// Tokeniza uma linha CSV respeitando aspas (campos com vírgula/ponto-e-vírgula
// dentro de aspas não devem ser quebrados — formato comum de extrato
// bancário brasileiro: `"PAGTO FORNECEDOR, REF 123"`). F3-19.
export function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Aspas escapadas ("") dentro de um campo entre aspas
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cols.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cols.push(current.trim());

  return cols.map((c) => c.replace(/^"|"$/g, ""));
}

// Detecta o delimitador (`,` ou `;`) contando ocorrências fora de aspas na
// linha de cabeçalho — bancos brasileiros exportam com `;` frequentemente.
function detectDelimiter(headerLine: string): "," | ";" {
  let commaCount = 0;
  let semicolonCount = 0;
  let inQuotes = false;

  for (const char of headerLine) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && char === ",") commaCount++;
    else if (!inQuotes && char === ";") semicolonCount++;
  }

  return semicolonCount > commaCount ? ";" : ",";
}

export function parseCSV(content: string): ParsedImportRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headerLine = lines[0];
  if (!headerLine) return [];

  const delimiter = detectDelimiter(headerLine);

  const headers = splitDelimitedLine(headerLine, delimiter).map((h) =>
    h.toLowerCase().trim(),
  );

  const dateIdx = headers.findIndex((h) => h.includes("data") || h === "date");
  const amountIdx = headers.findIndex(
    (h) =>
      h.includes("valor") ||
      h === "amount" ||
      h.includes("vlr") ||
      h.includes("lanc"),
  );
  const descIdx = headers.findIndex(
    (h) =>
      h.includes("descr") ||
      h.includes("memo") ||
      h.includes("histor") ||
      h.includes("complement"),
  );

  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const cols = splitDelimitedLine(line, delimiter);

    const rawDate = dateIdx >= 0 ? (cols[dateIdx] ?? "") : "";
    const rawAmount = amountIdx >= 0 ? (cols[amountIdx] ?? "") : "";
    const desc = descIdx >= 0 ? (cols[descIdx] ?? "") : "";

    if (!rawDate || !rawAmount) continue;

    // Normalize date formats: DD/MM/YYYY → YYYY-MM-DD
    let dateStr = rawDate;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const parts = rawDate.split("/");
      dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
      const parts = rawDate.split("-");
      dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const amount = parseFloat(
      rawAmount
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, ""),
    );

    if (isNaN(amount)) continue;

    rows.push({ date: dateStr, amount, description: desc });
  }

  return rows;
}

export function parseFileContent(
  content: string,
  format: "ofx" | "csv",
): ParsedImportRow[] {
  return format === "ofx" ? parseOFX(content) : parseCSV(content);
}
