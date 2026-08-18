import { describe, expect, it } from "vitest";
import { filterCategory, filterWeekdayShift } from "./dashboardFilters";

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
});
