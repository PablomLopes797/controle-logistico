import * as XLSX from "xlsx";

export type AgendaImportRecord = {
  senha: string;
  dataAgenda: string;
  horaAgenda: string;
  fornecedor: string;
  plu: string;
  qtdCx: string;
  produto: string;
  categoria: string;
  valorRs: string;
  pesoCx: string;
  curvaItem: string;
  statusRuptura: string;
  qtdPaletes: string;
};

export type AgendaImportPreview = {
  records: AgendaImportRecord[];
  scannedRows: number;
  eligibleRows: number;
  skippedRows: number;
  invalidRows: Array<{ row: number; reason: string }>;
};

const COLUMN_INDEX = {
  type: 0,
  senha: 3,
  dataAgenda: 4,
  horaAgenda: 5,
  fornecedor: 8,
  plu: 10,
  qtdCx: 11,
  produto: 12,
  categoria: 13,
  valorRs: 17,
  pesoCx: 18,
  curvaItem: 20,
  statusRuptura: 23,
  qtdPaletes: 37,
} as const;

function asText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function mapRecord(row: unknown[]): AgendaImportRecord {
  return {
    senha: asText(row[COLUMN_INDEX.senha]),
    dataAgenda: asText(row[COLUMN_INDEX.dataAgenda]),
    horaAgenda: asText(row[COLUMN_INDEX.horaAgenda]),
    fornecedor: asText(row[COLUMN_INDEX.fornecedor]),
    plu: asText(row[COLUMN_INDEX.plu]),
    qtdCx: asText(row[COLUMN_INDEX.qtdCx]),
    produto: asText(row[COLUMN_INDEX.produto]),
    categoria: asText(row[COLUMN_INDEX.categoria]),
    valorRs: asText(row[COLUMN_INDEX.valorRs]),
    pesoCx: asText(row[COLUMN_INDEX.pesoCx]),
    curvaItem: asText(row[COLUMN_INDEX.curvaItem]),
    statusRuptura: asText(row[COLUMN_INDEX.statusRuptura]),
    qtdPaletes: asText(row[COLUMN_INDEX.qtdPaletes]),
  };
}

export function parseAgendaWorkbook(workbook: XLSX.WorkBook): AgendaImportPreview {
  const worksheet = workbook.Sheets.Agendas;
  if (!worksheet) throw new Error('A planilha precisa conter uma aba chamada exatamente "Agendas".');

  const allRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  const rows = allRows.slice(6);
  const records: AgendaImportRecord[] = [];
  const invalidRows: AgendaImportPreview["invalidRows"] = [];
  let eligibleRows = 0;
  let skippedRows = 0;

  rows.forEach((row, index) => {
    if (asText(row[COLUMN_INDEX.type]) !== "910") {
      skippedRows += 1;
      return;
    }

    eligibleRows += 1;
    const record = mapRecord(row);
    const missing = [
      !record.senha ? "SENHA (D)" : "",
      !record.dataAgenda ? "DATA AGENDA (E)" : "",
    ].filter(Boolean);

    if (missing.length > 0) {
      invalidRows.push({ row: index + 7, reason: `Campo obrigatório ausente: ${missing.join(", ")}.` });
      return;
    }

    records.push(record);
  });

  return { records, scannedRows: rows.length, eligibleRows, skippedRows, invalidRows };
}

export async function parseAgendaFile(file: File) {
  const buffer = await file.arrayBuffer();
  return parseAgendaWorkbook(XLSX.read(buffer, { type: "array", cellDates: false }));
}
