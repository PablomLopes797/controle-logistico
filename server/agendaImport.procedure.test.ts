import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { PERFORMANCE_SESSION_COOKIE, writePerformanceSession } from "./logisticsAuth";
import type { TrpcContext } from "./_core/context";

async function authenticatedContext() {
  let token = "";
  await writePerformanceSession(
    { protocol: "https", headers: {} } as never,
    { cookie: (_name: string, value: string) => { token = value; } } as never,
    { user: "operador", name: "Usuário de Operação", level: 2 },
  );
  return {
    user: null,
    req: { protocol: "https", headers: { cookie: `${PERFORMANCE_SESSION_COOKIE}=${token}` } },
    res: {},
  } as TrpcContext;
}

const input = {
  records: [{
    senha: "S-001",
    dataAgenda: "18/08/2026",
    horaAgenda: "08:00",
    fornecedor: "Fornecedor Teste",
    plu: "1001",
    qtdCx: "20",
    produto: "Produto Teste",
    categoria: "Mercearia",
    valorRs: "100,00",
    pesoCx: "10",
    curvaItem: "A",
    statusRuptura: "",
    qtdPaletes: "5",
  }],
};

describe("logistics.agenda.import", () => {
  it("confirms the persisted record when Supabase replies 201 with an empty body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 201 }));

    const report = await appRouter.createCaller(await authenticatedContext()).logistics.agenda.import(input);

    expect(report).toMatchObject({ submitted: 1, inserted: 1, rejected: 0 });
    expect(report.batches[0]).toMatchObject({ status: "success", inserted: 1, rejected: [] });
    fetchMock.mockRestore();
  });

  it("returns refreshed analytics from the imported agenda schema", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify([{
      SENHA: "S-001",
      "DATA AGENDA": "18/08/2026",
      "HORA AGENDA": "08:00",
      FORNECEDOR: "Fornecedor Teste",
      CATEGORIA: "Mercearia",
      "QTD DE PALETES": "5",
      "STATUS DE RUPTURA": "SIM",
    }]), { status: 200, headers: { "Content-Type": "application/json" } }));

    const dashboard = await appRouter.createCaller(await authenticatedContext()).logistics.reception.dashboard();

    expect(dashboard.totals).toEqual({ vehicles: 1, pallets: 5, ruptureItems: 1, ruptureVehicles: 1 });
    fetchMock.mockRestore();
  });

  it("chains a successful import to the refreshed dashboard data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      if (init?.method === "POST") return new Response(null, { status: 201 });
      return new Response(JSON.stringify([{
        SENHA: "S-001",
        "DATA AGENDA": "18/08/2026",
        "HORA AGENDA": "08:00",
        FORNECEDOR: "Fornecedor Teste",
        CATEGORIA: "Mercearia",
        "QTD DE PALETES": "5",
        "STATUS DE RUPTURA": "",
      }]), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    const caller = appRouter.createCaller(await authenticatedContext());

    const report = await caller.logistics.agenda.import(input);
    const dashboard = await caller.logistics.reception.dashboard();

    expect(report).toMatchObject({ inserted: 1, rejected: 0 });
    expect(dashboard.totals).toMatchObject({ vehicles: 1, pallets: 5 });
    expect(fetchMock.mock.calls.map(([, init]) => init?.method ?? "GET")).toEqual(["POST", "GET"]);
    fetchMock.mockRestore();
  });
});
