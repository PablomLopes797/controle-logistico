import { describe, expect, it } from "vitest";
import { filterCategory, filterMacroCategoryByDay, filterWeekdayShift } from "./dashboardFilters";

describe("dashboard internal controls", () => {
  const categories = [{ label: "Frios", value: 4 }, { label: "Mercearia", value: 7 }];
  const weekdayShift = [
    { label: "Segunda · 1º Turno", weekday: "Segunda", shift: "1º Turno", value: 2 },
    { label: "Segunda · 2º Turno", weekday: "Segunda", shift: "2º Turno", value: 3 },
    { label: "Terça · 1º Turno", weekday: "Terça", shift: "1º Turno", value: 1 },
  ];

  it("isolates one category or keeps the complete category set", () => {
    expect(filterCategory(categories, "Frios")).toEqual([{ label: "Frios", value: 4 }]);
    expect(filterCategory(categories, "all")).toEqual(categories);
  });

  it("combines weekday and shift controls", () => {
    expect(filterWeekdayShift(weekdayShift, "Segunda", "2º Turno")).toEqual([weekdayShift[1]]);
    expect(filterWeekdayShift(weekdayShift, "all", "1º Turno")).toEqual([weekdayShift[0], weekdayShift[2]]);
  });

  it("filters macro categories while preserving their daily points", () => {
    const macroPoints = [
      { label: "18/08/2026 · FRI", date: "18/08/2026", macroCategory: "FRI", value: 2 },
      { label: "19/08/2026 · MER", date: "19/08/2026", macroCategory: "MER", value: 3 },
    ];
    expect(filterMacroCategoryByDay(macroPoints, "FRI")).toEqual([macroPoints[0]]);
  });
});
