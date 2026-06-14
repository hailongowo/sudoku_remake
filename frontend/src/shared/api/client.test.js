import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";

afterEach(() => vi.restoreAllMocks());

describe("apiRequest", () => {
  it("adds bearer tokens and parses JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await expect(apiRequest("/test", { token: "abc" })).resolves.toEqual({ ok: true });
    expect(fetch.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer abc");
  });

  it("normalizes FastAPI errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ detail: "No rated puzzles available" }), { status: 503 }));
    await expect(apiRequest("/rated/start")).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
      message: "No rated puzzles available",
      details: { detail: "No rated puzzles available" },
    });
  });
});
