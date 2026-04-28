import { describe, it, expect, vi, beforeEach } from "vitest";
import { triggerN8nWebhook } from "@/lib/n8n";

describe("triggerN8nWebhook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST with correct headers and body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"message":"Workflow was started"}'),
    });
    vi.stubGlobal("fetch", mockFetch);

    await triggerN8nWebhook("/webhook/test", { foo: "bar" });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:5678/webhook/test",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ foo: "bar" }),
      })
    );
  });

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"message":"Workflow was started"}'),
      })
    );

    const result = await triggerN8nWebhook("/webhook/test", {});
    expect(result).toEqual({ message: "Workflow was started" });
  });

  it("returns message wrapper for non-JSON response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("OK"),
      })
    );

    const result = await triggerN8nWebhook("/webhook/test", {});
    expect(result).toEqual({ message: "OK" });
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      })
    );

    await expect(
      triggerN8nWebhook("/webhook/test", {})
    ).rejects.toThrow("n8n webhook failed: 500 Internal Server Error");
  });
});
