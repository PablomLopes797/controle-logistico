export type CategoryPoint = { label: string; value: number };
export type WeekdayShiftPoint = CategoryPoint & { weekday: string; shift: string };
export type MacroCategoryDayPoint = CategoryPoint & { date: string; macroCategory: string };

export function filterCategory(points: CategoryPoint[], category: string) {
  return category === "all" ? points : points.filter(point => point.label === category);
}

export function filterWeekdayShift(points: WeekdayShiftPoint[], weekday: string, shift: string) {
  return points.filter(point => (weekday === "all" || point.weekday === weekday) && (shift === "all" || point.shift === shift));
}

export function filterMacroCategoryByDay(points: MacroCategoryDayPoint[], macroCategory: string) {
  return macroCategory === "all" ? points : points.filter(point => point.macroCategory === macroCategory);
}
