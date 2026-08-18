import { describe, expect, it } from "vitest";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe("Supabase connection", () => {
  it("authenticates the configured server key against USER_PERF", async () => {
    expect(supabaseUrl).toMatch(/^https:\/\/.+\.supabase\.co$/);
    expect(serviceRoleKey).toBeTruthy();

    const response = await fetch(
      `${supabaseUrl}/rest/v1/USER_PERF?select=USER&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey!,
          Authorization: `Bearer ${serviceRoleKey!}`,
        },
      },
    );

    expect(response.status, await response.text()).toBe(200);
  }, 15_000);

  it("authenticates the configured server key against AGENDA_REC", async () => {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/AGENDA_REC?select=SENHA,DATA%20AGENDA,HORA%20AGENDA,FORNECEDOR,CATEGORIA,QTD%20DE%20PALETES,STATUS%20DE%20RUPTURA&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey!,
          Authorization: `Bearer ${serviceRoleKey!}`,
        },
      },
    );

    expect(response.status, await response.text()).toBe(200);
  }, 15_000);
});
