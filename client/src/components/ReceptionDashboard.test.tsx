import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import ReceptionDashboard from "./ReceptionDashboard";

const { mockedDashboard, useDashboardQuery } = vi.hoisted(() => {
  const mockedDashboard = {
    totals: { vehicles: 3, pallets: 18, ruptureItems: 1, ruptureVehicles: 1 },
    dateRange: { min: "2026-08-18", max: "2026-08-19", daysInPeriod: 2 },
    vehiclesByDay: [{ label: "18/08/2026", value: 2 }, { label: "19/08/2026", value: 1 }],
    vehiclesByMacroCategoryAndDay: [{ label: "18/08/2026 · FRI", date: "18/08/2026", macroCategory: "FRI", value: 2 }, { label: "19/08/2026 · MER", date: "19/08/2026", macroCategory: "MER", value: 1 }],
    vehiclesByHour: [{ label: "08:00", value: 2 }], palletsByHour: [{ label: "08:00", value: 8 }],
    palletsByShift: [{ label: "1º Turno", value: 15 }, { label: "3º Turno", value: 3 }],
    palletsByDay: [{ label: "18/08/2026", value: 14 }, { label: "19/08/2026", value: 4 }],
    palletsByCategory: [{ label: "Frios", value: 12 }, { label: "Mercearia", value: 6 }],
    ruptureItemsByDay: [{ label: "19/08/2026", value: 1 }], ruptureVehiclesByDay: [{ label: "19/08/2026", value: 1 }],
  };
  return { mockedDashboard, useDashboardQuery: vi.fn((..._args: unknown[]) => ({ data: mockedDashboard, isLoading: false, error: null, isFetching: false, refetch: vi.fn() })) };
});

vi.mock("@/lib/trpc", () => ({
  trpc: { logistics: { reception: { dashboard: { useQuery: useDashboardQuery } } } },
}));

beforeAll(() => {
  class ResizeObserverMock { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

afterEach(() => cleanup());

describe("ReceptionDashboard", () => {
  it("renders the authenticated analytical view with Brazilian dates, filters and visible average labels", () => {
    render(<ReceptionDashboard />);

    expect(screen.getByText("Filtros globais")).toBeTruthy();
    expect(screen.getByDisplayValue("Todo o período")).toBeTruthy();
    expect(screen.getByText("Veículos por hora")).toBeTruthy();
    expect(screen.getAllByText(/média dos totais diários em 2 dia/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/1º turno: 06:00–13:59/i)).toBeTruthy();
    expect(screen.getAllByText(/dd\/mm\/aaaa/).length).toBeGreaterThanOrEqual(1);

    fireEvent.change(screen.getByLabelText("Filtrar categoria macro"), { target: { value: "FRI" } });

    expect((screen.getByLabelText("Filtrar categoria macro") as HTMLSelectElement).value).toBe("FRI");
    expect(screen.queryByText("Veículos por dia da semana e turno")).toBeNull();
  });

  it("uses a manually selected start date when applying the future period shortcut", () => {
    useDashboardQuery.mockClear();
    render(<ReceptionDashboard />);

    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-12-20" } });
    fireEvent.change(screen.getByLabelText("Período pré-definido"), { target: { value: "7" } });

    expect(useDashboardQuery.mock.calls.at(-1)?.[0]).toEqual({ startDate: "2026-12-20", endDate: "2026-12-26" });
  });

  it("keeps a manually selected start date when applying the 30-day future shortcut", () => {
    useDashboardQuery.mockClear();
    render(<ReceptionDashboard />);

    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-12-20" } });
    fireEvent.change(screen.getByLabelText("Período pré-definido"), { target: { value: "30" } });

    expect(useDashboardQuery.mock.calls.at(-1)?.[0]).toEqual({ startDate: "2026-12-20", endDate: "2027-01-18" });
  });
});
