import { describe, expect, it } from "vitest";
import { hashPassword, normalizeLevel, verifyPassword } from "./supabase";

describe("password security", () => {
  it("stores newly created passwords as hashes and validates the correct value", async () => {
    const stored = await hashPassword("SenhaSegura#2026");

    expect(stored).toMatch(/^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
    await expect(verifyPassword("SenhaSegura#2026", stored)).resolves.toEqual({ valid: true, legacy: false });
    await expect(verifyPassword("senha-incorreta", stored)).resolves.toEqual({ valid: false, legacy: false });
  });

  it("maintains compatibility with legacy values while normalizing access levels", async () => {
    await expect(verifyPassword("legado", "legado")).resolves.toEqual({ valid: true, legacy: true });
    expect(normalizeLevel("1")).toBe(1);
    expect(normalizeLevel(2)).toBe(2);
    expect(normalizeLevel("qualquer-valor")).toBe(2);
  });
});
