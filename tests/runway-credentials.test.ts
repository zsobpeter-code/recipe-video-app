import { describe, it, expect } from "vitest";

describe("Runway API Credentials Validation", () => {
  it("should have RUNWAY_API_KEY environment variable set", () => {
    const apiKey = process.env.RUNWAY_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey?.length).toBeGreaterThan(10);
  });

  it("should have valid Runway API key format", () => {
    const apiKey = process.env.RUNWAY_API_KEY;
    expect(apiKey).toBeDefined();
    // Runway API keys typically start with "key_"
    expect(apiKey?.startsWith("key_")).toBe(true);
  });

  it("should be able to authenticate with Runway API", async () => {
    const apiKey = process.env.RUNWAY_API_KEY;
    expect(apiKey).toBeDefined();

    // Test authentication by calling the Runway API
    // Using the /v1/tasks endpoint to check if the key is valid
    const response = await fetch("https://api.dev.runwayml.com/v1/tasks?limit=1", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    // A valid key should return 200 (success) or 404 (no tasks found)
    // An invalid key would return 401 (unauthorized)
    expect(response.status).not.toBe(401);
    expect([200, 404].includes(response.status) || response.ok).toBe(true);
  });
});
