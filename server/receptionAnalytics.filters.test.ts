import { describe, expect, it } from "vitest";
import { buildReceptionDashboard, shiftForHour } from "./receptionAnalytics";

const records = [
  { SENHA: "A", "DATA AGENDA": "8/18/26", "HORA AGENDA": "08:00", CATEGORIA: "Frios", "QTD DE PALETES": "10", "STATUS DE RUPTURA": "" },
  { SENHA: "B", "DATA AGENDA": "18/08/2026", "HORA AGENDA": "08:30", CATEGORIA: "Frios", "QTD DE PALETES": "6", "STATUS DE RUPTURA": "" },
  { SENHA: "C", "DATA AGENDA": "19/08/2026", "HORA AGENDA": "08:00", CATEGORIA: "Mercearia", "QTD DE PALETES": "4", "STATUS DE RUPTURA": "SIM" },
  { SENHA: "D", "DATA AGENDA": "19/08/2026", "HORA AGENDA": "22:10", CATEGORIA: "Mercearia", "QTD DE PALETES": "3", "STATUS DE RUPTURA": "" },
];

describe("reception dashboard filters and averages", () => {
  it("formats source dates in Brazilian format and calculates daily averages", () => {
    const dashboard = buildReceptionDashboard(records);
    expect(dashboard.vehiclesByDay.map(point => point.label)).toEqual(["18/08/2026", "19/08/2026"]);
    expect(dashboard.vehiclesByHour).toContainEqual({ label: "08:00", value: 1.5 });
    expect(dashboard.palletsByHour).toContainEqual({ label: "08:00", value: 10 });
  });

  it("filters all analytics by the selected date interval", () => {
    const dashboard = buildReceptionDashboard(records, { startDate: "2026-08-19", endDate: "2026-08-19" });
    expect(dashboard.totals).toMatchObject({ vehicles: 2, pallets: 7, ruptureItems: 1 });
    expect(dashboard.vehiclesByDay).toEqual([{ label: "19/08/2026", value: 2 }]);
    expect(dashboard.dateRange.daysInPeriod).toBe(1);
  });

  it("uses the operational 1º, 2º and 3º shift boundaries", () => {
    expect(shiftForHour(5)).toBe("3º Turno");
    expect(shiftForHour(6)).toBe("1º Turno");
    expect(shiftForHour(13)).toBe("1º Turno");
    expect(shiftForHour(14)).toBe("2º Turno");
    expect(shiftForHour(21)).toBe("2º Turno");
    expect(shiftForHour(22)).toBe("3º Turno");
    expect(buildReceptionDashboard(records).palletsByShift).toContainEqual({ label: "3º Turno", value: 3 });
  });
});
