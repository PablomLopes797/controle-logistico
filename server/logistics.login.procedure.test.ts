import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { PERFORMANCE_SESSION_COOKIE } from "./logisticsAuth";
import { hashPassword } from "./supabase";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

function createContext() {
  const cookies: CookieCall[] = [];
  const ctx = {
    user: null,
    req: { protocol: "https", headers: {} },
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }),
    },
  } as TrpcContext;
  return { ctx, cookies };
}

describe("logistics.login", () => {
  it("returns the authenticated user and creates the application session", async () => {
    const password = await hashPassword("SenhaSegura#2026");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify([{
      USER: "operador",
      NAME: "Usuário de Operação",
      PASSWORD: password,
      LEVEL: 2,
    }]), { status: 200, headers: { "Content-Type": "application/json" } }));
    const { ctx, cookies } = createContext();

    const result = await appRouter.createCaller(ctx).logistics.login({ user: "operador", password: "SenhaSegura#2026" });

    expect(result).toEqual({ user: "operador", name: "Usuário de Operação", level: 2 });
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(PERFORMANCE_SESSION_COOKIE);
    expect(cookies[0]?.value).toBeTruthy();
    fetchMock.mockRestore();
  });

  it("rejects invalid credentials with UNAUTHORIZED", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const { ctx, cookies } = createContext();

    await expect(appRouter.createCaller(ctx).logistics.login({ user: "inexistente", password: "senha-invalida" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(cookies).toHaveLength(0);
    fetchMock.mockRestore();
  });
});
