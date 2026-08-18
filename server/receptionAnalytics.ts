import type { AgendaRecRow } from "./supabase";

type ChartPoint = { label: string; value: number };

export type ReceptionDashboard = {
  totals: {
    vehicles: number;
    pallets: number;
    ruptureItems: number;
    ruptureVehicles: number;
  };
  vehiclesByDay: ChartPoint[];
  vehiclesByCategory: ChartPoint[];
  vehiclesByHour: ChartPoint[];
  vehiclesByWeekdayAndShift: ChartPoint[];
  palletsByHour: ChartPoint[];
  palletsByShift: ChartPoint[];
  palletsByDay: ChartPoint[];
  palletsByCategory: ChartPoint[];
  ruptureItemsByDay: ChartPoint[];
  ruptureVehiclesByDay: ChartPoint[];
};

type NormalizedAgenda = {
  senha: string;
  dataAgenda: string;
  horaAgenda: string;
  categoria: string;
  pallets: number;
  rupture: boolean;
};

const weekdayLabels = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function text(value: unknown) {
  return String(value ?? "").trim();
}

function number(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const content = text(value).replace(/R\$\s?/g, "").replace(/\s/g, "");
  if (!content) return 0;
  const normalized = content.includes(",")
    ? content.replace(/\./g, "").replace(",", ".")
    : content.replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getHour(value: string) {
  const match = value.match(/(\d{1,2})/);
  const parsed = match ? Number(match[1]) : -1;
  return parsed >= 0 && parsed <= 23 ? parsed : null;
}

function shiftForHour(hour: number | null) {
  if (hour === null) return "Não informado";
  if (hour >= 6 && hour < 14) return "Manhã";
  if (hour >= 14 && hour < 22) return "Tarde";
  return "Noite";
}

function weekdayForDate(value: string) {
  const brazilian = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const date = brazilian
    ? new Date(Number(brazilian[3]), Number(brazilian[2]) - 1, Number(brazilian[1]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? "Sem data" : weekdayLabels[date.getDay()]!;
}

function isRupture(value: unknown) {
  const normalized = text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return !["", "0", "N", "NAO", "FALSE", "SEM RUPTURA", "NAO APLICAVEL"].includes(normalized);
}

function normalize(row: AgendaRecRow): NormalizedAgenda {
  return {
    senha: text(row.SENHA) || "Sem senha",
    dataAgenda: text(row["DATA AGENDA"]) || "Sem data",
    horaAgenda: text(row["HORA AGENDA"]),
    categoria: text(row.CATEGORIA) || "Não informado",
    pallets: number(row["QTD DE PALETES"]),
    rupture: isRupture(row["STATUS DE RUPTURA"]),
  };
}

function mapToPoints(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { numeric: true }));
}

function add(map: Map<string, number>, label: string, value = 1) {
  map.set(label, (map.get(label) ?? 0) + value);
}

function addDistinct(map: Map<string, Set<string>>, label: string, id: string) {
  const values = map.get(label) ?? new Set<string>();
  values.add(id);
  map.set(label, values);
}

function distinctPoints(map: Map<string, Set<string>>) {
  return mapToPoints(new Map(Array.from(map.entries()).map(([label, ids]) => [label, ids.size])));
}

export function buildReceptionDashboard(rows: AgendaRecRow[]): ReceptionDashboard {
  const records = rows.map(normalize);
  const vehiclesByDay = new Map<string, Set<string>>();
  const vehiclesByCategory = new Map<string, Set<string>>();
  const vehiclesByHour = new Map<string, Set<string>>();
  const vehiclesByWeekdayAndShift = new Map<string, Set<string>>();
  const palletsByHour = new Map<string, number>();
  const palletsByShift = new Map<string, number>();
  const palletsByDay = new Map<string, number>();
  const palletsByCategory = new Map<string, number>();
  const ruptureItemsByDay = new Map<string, number>();
  const ruptureVehiclesByDay = new Map<string, Set<string>>();
  const allVehicles = new Set<string>();
  const ruptureVehicles = new Set<string>();
  let totalPallets = 0;
  let ruptureItems = 0;

  records.forEach(record => {
    const hour = getHour(record.horaAgenda);
    const hourLabel = hour === null ? "Não informado" : `${String(hour).padStart(2, "0")}:00`;
    const shift = shiftForHour(hour);
    const weekdayShift = `${weekdayForDate(record.dataAgenda)} · ${shift}`;

    allVehicles.add(record.senha);
    addDistinct(vehiclesByDay, record.dataAgenda, record.senha);
    addDistinct(vehiclesByCategory, record.categoria, record.senha);
    addDistinct(vehiclesByHour, hourLabel, record.senha);
    addDistinct(vehiclesByWeekdayAndShift, weekdayShift, record.senha);
    add(palletsByHour, hourLabel, record.pallets);
    add(palletsByShift, shift, record.pallets);
    add(palletsByDay, record.dataAgenda, record.pallets);
    add(palletsByCategory, record.categoria, record.pallets);
    totalPallets += record.pallets;

    if (record.rupture) {
      ruptureItems += 1;
      ruptureVehicles.add(record.senha);
      add(ruptureItemsByDay, record.dataAgenda);
      addDistinct(ruptureVehiclesByDay, record.dataAgenda, record.senha);
    }
  });

  return {
    totals: {
      vehicles: allVehicles.size,
      pallets: totalPallets,
      ruptureItems,
      ruptureVehicles: ruptureVehicles.size,
    },
    vehiclesByDay: distinctPoints(vehiclesByDay),
    vehiclesByCategory: distinctPoints(vehiclesByCategory),
    vehiclesByHour: distinctPoints(vehiclesByHour),
    vehiclesByWeekdayAndShift: distinctPoints(vehiclesByWeekdayAndShift),
    palletsByHour: mapToPoints(palletsByHour),
    palletsByShift: mapToPoints(palletsByShift),
    palletsByDay: mapToPoints(palletsByDay),
    palletsByCategory: mapToPoints(palletsByCategory),
    ruptureItemsByDay: mapToPoints(ruptureItemsByDay),
    ruptureVehiclesByDay: distinctPoints(ruptureVehiclesByDay),
  };
}
