export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function futurePeriodRange(referenceDate: Date, totalDays: number) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(0, totalDays - 1));
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

export function futurePeriodFromSelectedStart(selectedStartDate: string | undefined, fallbackDate: Date, totalDays: number) {
  if (selectedStartDate) {
    const [year, month, day] = selectedStartDate.split("-").map(Number);
    if (year && month && day) return futurePeriodRange(new Date(year, month - 1, day), totalDays);
  }
  return futurePeriodRange(fallbackDate, totalDays);
}
