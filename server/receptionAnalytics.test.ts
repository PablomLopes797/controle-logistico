import { describe, expect, it } from "vitest";
import { buildReceptionDashboard } from "./receptionAnalytics";

describe("buildReceptionDashboard", () => {
  it("groups distinct vehicles, pallets and rupture indicators from agenda records", () => {
    const dashboard = buildReceptionDashboard([
      {
        SENHA: "A01",
        "DATA AGENDA": "18/08/2026",
        "HORA AGENDA": "08:20",
        CATEGORIA: "Perecíveis",
        "QTD DE PALETES": "10",
        "STATUS DE RUPTURA": "SIM",
      },
      {
        SENHA: "A01",
        "DATA AGENDA": "18/08/2026",
        "HORA AGENDA": "08:40",
        CATEGORIA: "Perecíveis",
        "QTD DE PALETES": "5",
        "STATUS DE RUPTURA": "NÃO",
      },
      {
        SENHA: "B02",
        "DATA AGENDA": "19/08/2026",
        "HORA AGENDA": "16:00",
        CATEGORIA: "Mercearia",
        "QTD DE PALETES": "7",
        "STATUS DE RUPTURA": "COM RUPTURA",
      },
    ]);

    expect(dashboard.totals).toEqual({
      vehicles: 2,
      pallets: 22,
      ruptureItems: 2,
      ruptureVehicles: 2,
    });
    expect(dashboard.vehiclesByDay).toEqual([
      { label: "18/08/2026", value: 1 },
      { label: "19/08/2026", value: 1 },
    ]);
    expect(dashboard.palletsByShift).toEqual([
      { label: "1º Turno", value: 15 },
      { label: "2º Turno", value: 7 },
    ]);
    expect(dashboard.ruptureVehiclesByDay).toEqual([
      { label: "18/08/2026", value: 1 },
      { label: "19/08/2026", value: 1 },
    ]);
  });
});
