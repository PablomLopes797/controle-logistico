import type { AgendaRecRow } from "./supabase";

export type ChartPoint = { label: string; value: number };
export type MacroCategoryDayPoint = ChartPoint & { date: string; macroCategory: string };

export type ReceptionDashboardFilters = { startDate?: string; endDate?: string };

export type ReceptionDashboard = {
  totals: { vehicles: number; pallets: number; ruptureItems: number; ruptureVehicles: number };
  dateRange: { min: string | null; max: string | null; daysInPeriod: number };
  vehiclesByDay: ChartPoint[];
  vehiclesByMacroCategoryAndDay: MacroCategoryDayPoint[];
  vehiclesByHour: ChartPoint[];
  palletsByHour: ChartPoint[];
  palletsByShift: ChartPoint[];
  palletsByDay: ChartPoint[];
  palletsByCategory: ChartPoint[];
  ruptureItemsByDay: ChartPoint[];
  ruptureVehiclesByDay: ChartPoint[];
};

type NormalizedAgenda = { senha: string; dateKey: string | null; hour: number | null; categoria: string; macroCategory: string; pallets: number; rupture: boolean };
const shiftLabels = ["1º Turno", "2º Turno", "3º Turno", "Não informado"];

function text(value: unknown) { return String(value ?? "").trim(); }
function number(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const content = text(value).replace(/R\$\s?/g, "").replace(/\s/g, "");
  if (!content) return 0;
  const normalized = content.includes(",") ? content.replace(/\./g, "").replace(",", ".") : content.replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
function localDate(year: number, month: number, day: number) { const date = new Date(year, month - 1, day); return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null; }
function parseAgendaDate(value: unknown) {
  const content = text(value);
  const parts = content.match(/^(\d{1,4})[\/-](\d{1,2})[\/-](\d{1,4})/);
  if (parts) {
    let first = Number(parts[1]); let second = Number(parts[2]); let year = Number(parts[3]);
    if (year < 100) year += 2000;
    let day = first; let month = second;
    if (first <= 12 && second > 12) { month = first; day = second; }
    if (parts[1].length === 4) { year = first; month = second; day = Number(parts[3]); }
    return localDate(year, month, day);
  }
  const date = new Date(content);
  return Number.isNaN(date.getTime()) ? null : localDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dateLabelFromKey(key: string) { if (key === "sem-data") return "Sem data"; return `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`; }
function getHour(value: string) { const match = value.match(/(\d{1,2})/); const parsed = match ? Number(match[1]) : -1; return parsed >= 0 && parsed <= 23 ? parsed : null; }
export function shiftForHour(hour: number | null) { if (hour === null) return "Não informado"; if (hour >= 6 && hour < 14) return "1º Turno"; if (hour >= 14 && hour < 22) return "2º Turno"; return "3º Turno"; }
function macroCategory(value: string) { const normalized = value.trim(); return normalized ? normalized.slice(0, 3).toUpperCase() : "N/I"; }
function isRupture(value: unknown) { const normalized = text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(); return !["", "0", "N", "NAO", "FALSE", "SEM RUPTURA", "NAO APLICAVEL"].includes(normalized); }
function normalize(row: AgendaRecRow): NormalizedAgenda {
  const date = parseAgendaDate(row["DATA AGENDA"]);
  const categoria = text(row.CATEGORIA) || "Não informado";
  return { senha: text(row.SENHA) || "Sem senha", dateKey: date ? dateKey(date) : null, hour: getHour(text(row["HORA AGENDA"])), categoria, macroCategory: macroCategory(categoria), pallets: number(row["QTD DE PALETES"]), rupture: isRupture(row["STATUS DE RUPTURA"]) };
}
function add(map: Map<string, number>, label: string, value = 1) { map.set(label, (map.get(label) ?? 0) + value); }
function addDistinct(map: Map<string, Set<string>>, label: string, id: string) { const ids = map.get(label) ?? new Set<string>(); ids.add(id); map.set(label, ids); }
function naturalPoints(map: Map<string, number>) { return Array.from(map.entries()).map(([label, value]) => ({ label, value: Math.round(value) })).sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { numeric: true })); }
function distinctPoints(map: Map<string, Set<string>>) { return naturalPoints(new Map(Array.from(map.entries()).map(([label, ids]) => [label, ids.size]))); }
function datePoints(map: Map<string, number>) { return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ({ label: dateLabelFromKey(key), value: Math.round(value) })); }
function wholeAverage(value: number, divisor: number) { return divisor > 0 ? Math.round(value / divisor) : 0; }
function periodDays(records: NormalizedAgenda[], filters: ReceptionDashboardFilters) {
  const start = filters.startDate ? parseAgendaDate(filters.startDate) : null;
  const end = filters.endDate ? parseAgendaDate(filters.endDate) : null;
  if (start && end) return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
  return Math.max(1, new Set(records.flatMap(record => record.dateKey ? [record.dateKey] : [])).size);
}

export function buildReceptionDashboard(rows: AgendaRecRow[], filters: ReceptionDashboardFilters = {}): ReceptionDashboard {
  const start = filters.startDate ? parseAgendaDate(filters.startDate) : null;
  const end = filters.endDate ? parseAgendaDate(filters.endDate) : null;
  const startKey = start ? dateKey(start) : undefined;
  const endKey = end ? dateKey(end) : undefined;
  const records = rows.map(normalize).filter(record => (!startKey || (record.dateKey && record.dateKey >= startKey)) && (!endKey || (record.dateKey && record.dateKey <= endKey)));
  const daysInPeriod = periodDays(records, filters);
  const vehiclesByDay = new Map<string, Set<string>>();
  const macroVehiclesByDay = new Map<string, Set<string>>();
  const hourlyVehicles = new Map<string, Set<string>>();
  const hourlyPallets = new Map<string, number>();
  const palletsByShift = new Map<string, number>();
  const palletsByDay = new Map<string, number>();
  const palletsByCategory = new Map<string, number>();
  const ruptureItemsByDay = new Map<string, number>();
  const ruptureVehiclesByDay = new Map<string, Set<string>>();
  const allVehicles = new Set<string>();
  const ruptureVehicles = new Set<string>();
  let totalPallets = 0; let ruptureItems = 0;

  for (const record of records) {
    const hourLabel = record.hour === null ? "Não informado" : `${String(record.hour).padStart(2, "0")}:00`;
    const dayKey = record.dateKey ?? "sem-data";
    allVehicles.add(record.senha);
    addDistinct(vehiclesByDay, dayKey, record.senha);
    addDistinct(macroVehiclesByDay, `${dayKey}|${record.macroCategory}`, record.senha);
    if (record.dateKey) {
      addDistinct(hourlyVehicles, `${record.dateKey}|${hourLabel}`, record.senha);
      add(hourlyPallets, `${record.dateKey}|${hourLabel}`, record.pallets);
    }
    add(palletsByShift, shiftForHour(record.hour), record.pallets);
    add(palletsByDay, dayKey, record.pallets);
    add(palletsByCategory, record.categoria, record.pallets);
    totalPallets += record.pallets;
    if (record.rupture) { ruptureItems += 1; ruptureVehicles.add(record.senha); add(ruptureItemsByDay, dayKey); addDistinct(ruptureVehiclesByDay, dayKey, record.senha); }
  }

  const hourVehicleTotals = new Map<string, number>();
  for (const [key, ids] of Array.from(hourlyVehicles.entries())) add(hourVehicleTotals, key.split("|")[1]!, ids.size);
  const hourPalletTotals = new Map<string, number>();
  for (const [key, value] of Array.from(hourlyPallets.entries())) add(hourPalletTotals, key.split("|")[1]!, value);
  const macroPoints: MacroCategoryDayPoint[] = Array.from(macroVehiclesByDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, ids]) => {
    const [dayKey, macro] = key.split("|");
    const date = dateLabelFromKey(dayKey!);
    return { label: `${date} · ${macro}`, date, macroCategory: macro!, value: ids.size };
  });
  const dateKeys = records.flatMap(record => record.dateKey ? [record.dateKey] : []).sort();
  return {
    totals: { vehicles: allVehicles.size, pallets: Math.round(totalPallets), ruptureItems, ruptureVehicles: ruptureVehicles.size },
    dateRange: { min: dateKeys[0] ?? null, max: dateKeys.at(-1) ?? null, daysInPeriod },
    vehiclesByDay: datePoints(new Map(Array.from(vehiclesByDay.entries()).map(([key, ids]) => [key, ids.size]))),
    vehiclesByMacroCategoryAndDay: macroPoints,
    vehiclesByHour: naturalPoints(new Map(Array.from(hourVehicleTotals.entries()).map(([label, value]) => [label, wholeAverage(value, daysInPeriod)]))).sort((a, b) => a.label.localeCompare(b.label)),
    palletsByHour: naturalPoints(new Map(Array.from(hourPalletTotals.entries()).map(([label, value]) => [label, wholeAverage(value, daysInPeriod)]))).sort((a, b) => a.label.localeCompare(b.label)),
    palletsByShift: shiftLabels.filter(label => palletsByShift.has(label)).map(label => ({ label, value: Math.round(palletsByShift.get(label)!) })),
    palletsByDay: datePoints(palletsByDay),
    palletsByCategory: naturalPoints(palletsByCategory),
    ruptureItemsByDay: datePoints(ruptureItemsByDay),
    ruptureVehiclesByDay: datePoints(new Map(Array.from(ruptureVehiclesByDay.entries()).map(([key, ids]) => [key, ids.size]))),
  };
}
