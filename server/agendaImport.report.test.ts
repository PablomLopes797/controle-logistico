import { describe, expect, it } from "vitest";
import { AgendaPayload, insertAgendaRecords } from "./supabase";

const record = (senha: string): AgendaPayload => ({
  senha,
  dataAgenda: "18/08/2026",
  horaAgenda: "08:00",
  fornecedor: "Fornecedor teste",
  plu: `PLU-${senha}`,
  qtdCx: "10",
  produto: "Produto teste",
  categoria: "Categoria teste",
  valorRs: "10,00",
  pesoCx: "1",
  curvaItem: "A",
  statusRuptura: "",
  qtdPaletes: "2",
});

describe("insertAgendaRecords", () => {
  it("retries a failed batch by record and reports the rejected record", async () => {
    const report = await insertAgendaRecords([record("ok"), record("bad")], async batch => {
      if (batch.length > 1 || batch[0]?.senha === "bad") throw new Error("Registro rejeitado pelo Supabase");
    });

    expect(report).toMatchObject({ submitted: 2, inserted: 1, rejected: 1 });
    expect(report.batches).toEqual([{
      batch: 1,
      submitted: 2,
      inserted: 1,
      status: "partial",
      error: "Registro rejeitado pelo Supabase",
      rejected: [{ senha: "bad", plu: "PLU-bad", dataAgenda: "18/08/2026", reason: "Registro rejeitado pelo Supabase" }],
    }]);
  });
});
