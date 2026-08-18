import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { getPerformanceSession, PERFORMANCE_SESSION_COOKIE, requireLevelOne, writePerformanceSession } from "./logisticsAuth";

describe("requireLevelOne", () => {
  it("permits administrators of level 1", () => {
    expect(() => requireLevelOne({ user: "admin", name: "Administrador", level: 1 })).not.toThrow();
  });

  it("blocks level 2 users from administrative procedures", () => {
    try {
      requireLevelOne({ user: "operacao", name: "Operação", level: 2 });
      throw new Error("A autorização deveria ter sido bloqueada.");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});

describe("performance session", () => {
  it("writes and reads the signed session for a valid user", async () => {
    let token = "";
    const request = { protocol: "https", headers: {} } as never;
    const response = {
      cookie: (name: string, value: string) => {
        expect(name).toBe(PERFORMANCE_SESSION_COOKIE);
        token = value;
      },
    } as never;

    await writePerformanceSession(request, response, { user: "operador", name: "Usuário de Operação", level: 2 });

    const session = await getPerformanceSession({ headers: { cookie: `${PERFORMANCE_SESSION_COOKIE}=${token}` } } as never);
    expect(session).toEqual({ user: "operador", name: "Usuário de Operação", level: 2 });
  });
});
