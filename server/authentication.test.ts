import { describe, expect, it } from "vitest";
import { authenticateUser, hashPassword, type UserPerfRow } from "./supabase";

const baseUser: Omit<UserPerfRow, "PASSWORD"> = {
  USER: "operador",
  NAME: "Usuário de Operação",
  LEVEL: 2,
};

describe("authenticateUser", () => {
  it("returns a session for valid credentials", async () => {
    const password = await hashPassword("SenhaSegura#2026");
    const result = await authenticateUser("operador", "SenhaSegura#2026", async () => ({ ...baseUser, PASSWORD: password }));

    expect(result).toEqual({
      session: { user: "operador", name: "Usuário de Operação", level: 2 },
      legacy: false,
    });
  });

  it("returns null for an invalid password or an unknown user", async () => {
    const password = await hashPassword("SenhaSegura#2026");
    await expect(authenticateUser("operador", "senha-errada", async () => ({ ...baseUser, PASSWORD: password }))).resolves.toBeNull();
    await expect(authenticateUser("inexistente", "qualquer", async () => null)).resolves.toBeNull();
  });
});
