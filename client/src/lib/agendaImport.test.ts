import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseAgendaWorkbook } from "./agendaImport";

describe("parseAgendaWorkbook", () => {
  it("uses only the Agendas sheet, removes six rows, filters A=910 and maps the requested columns", () => {
    const preamble = Array.from({ length: 6 }, () => ["informação de apoio"]);
    const validRow = Array(38).fill("");
    validRow[0] = "910";
    validRow[3] = "S-100";
    validRow[4] = "18/08/2026";
    validRow[5] = "08:30";
    validRow[8] = "Fornecedor Norte";
    validRow[10] = "9988";
    validRow[11] = "45";
    validRow[12] = "Produto teste";
    validRow[13] = "Congelados";
    validRow[17] = "R$ 125,90";
    validRow[18] = "12,5";
    validRow[20] = "A";
    validRow[23] = "SIM";
    validRow[37] = "8";
    const ignoredRow = [...validRow];
    ignoredRow[0] = "911";
    const worksheet = XLSX.utils.aoa_to_sheet([...preamble, validRow, ignoredRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Agendas");

    const preview = parseAgendaWorkbook(workbook);

    expect(preview).toMatchObject({ scannedRows: 2, eligibleRows: 1, skippedRows: 1, invalidRows: [] });
    expect(preview.records).toEqual([{
      senha: "S-100", dataAgenda: "18/08/2026", horaAgenda: "08:30", fornecedor: "Fornecedor Norte", plu: "9988", qtdCx: "45", produto: "Produto teste", categoria: "Congelados", valorRs: "R$ 125,90", pesoCx: "12,5", curvaItem: "A", statusRuptura: "SIM", qtdPaletes: "8",
    }]);
  });

  it("rejects workbooks without the required Agendas sheet", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Outra aba");
    expect(() => parseAgendaWorkbook(workbook)).toThrow('aba chamada exatamente "Agendas"');
  });
});
