import { describe, expect, it } from "vitest";
import { futurePeriodFromSelectedStart, futurePeriodRange } from "./dashboardPeriod";

describe("futurePeriodRange", () => {
  it("starts today and ends in the future without moving the range backwards", () => {
    expect(futurePeriodRange(new Date(2026, 7, 18), 7)).toEqual({ startDate: "2026-08-18", endDate: "2026-08-24" });
    expect(futurePeriodRange(new Date(2026, 7, 18), 30)).toEqual({ startDate: "2026-08-18", endDate: "2026-09-16" });
  });

  it("uses the manually selected start date as the future-range reference", () => {
    expect(futurePeriodFromSelectedStart("2026-12-20", new Date(2026, 7, 18), 7)).toEqual({ startDate: "2026-12-20", endDate: "2026-12-26" });
  });
});
