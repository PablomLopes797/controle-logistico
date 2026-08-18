import { describe, expect, it } from "vitest";
import { readSupabaseResponse } from "./supabase";

describe("readSupabaseResponse", () => {
  it("accepts a successful write with an empty 201 response body", async () => {
    const response = new Response(null, { status: 201 });
    await expect(readSupabaseResponse<void>(response)).resolves.toBeUndefined();
  });

  it("continues to parse JSON payloads for successful read requests", async () => {
    const response = new Response(JSON.stringify([{ USER: "operador" }]), { status: 200 });
    await expect(readSupabaseResponse<Array<{ USER: string }>>(response)).resolves.toEqual([{ USER: "operador" }]);
  });
});
