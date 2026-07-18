import { describe, expect, it } from "vitest";

describe("DeepSeek health-report credentials", () => {
  it("can authenticate against the lightweight models endpoint", async () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.deepseek.com/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(response.ok).toBe(true);
  }, 20_000);
});
