import { describe, expect, it } from "vitest";
import { buildImportFeedback, finalizeImport } from "./importFeedback";

describe("buildImportFeedback", () => {
  it("confirms the import when all records are persisted", () => {
    expect(buildImportFeedback(320, 0)).toEqual({
      variant: "success",
      message: "320 registro(s) foram enviados ao Supabase.",
    });
  });

  it("uses a partial warning instead of reporting a total failure", () => {
    expect(buildImportFeedback(318, 2)).toMatchObject({
      variant: "warning",
      message: expect.stringContaining("318 registro(s) inserido(s) e 2 rejeitado(s)"),
    });
  });

  it("keeps the import successful when the dashboard refresh fails", async () => {
    const result = await finalizeImport(320, 0, async () => {
      throw new Error("Falha temporária no dashboard");
    });

    expect(result).toEqual({
      feedback: { variant: "success", message: "320 registro(s) foram enviados ao Supabase." },
      dashboardUpdated: false,
    });
  });
});
