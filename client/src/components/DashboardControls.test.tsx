import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardFilterControls, DashboardSelect } from "./DashboardControls";

describe("DashboardFilterControls", () => {
  it("emits global date and period filters from the rendered controls", () => {
    const onDateChange = vi.fn();
    const onPresetChange = vi.fn();
    render(<DashboardFilterControls filters={{ startDate: "2026-08-18" }} periodPreset="custom" onDateChange={onDateChange} onPresetChange={onPresetChange} onReset={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-08-20" } });
    fireEvent.change(screen.getByLabelText("Período pré-definido"), { target: { value: "7" } });

    expect(onDateChange).toHaveBeenCalledWith("endDate", "2026-08-20");
    expect(onPresetChange).toHaveBeenCalledWith("7");
    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeTruthy();
  });

  it("emits a selected category, weekday or shift value through the shared select control", () => {
    const onChange = vi.fn();
    render(<DashboardSelect ariaLabel="Filtrar categoria de veículos" value="all" onChange={onChange}><option value="all">Todas</option><option value="Frios">Frios</option></DashboardSelect>);

    fireEvent.change(screen.getByLabelText("Filtrar categoria de veículos"), { target: { value: "Frios" } });
    expect(onChange).toHaveBeenCalledWith("Frios");
  });
});
