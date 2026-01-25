import { describe, it, expect } from "vitest";

describe("Anthropic API Credentials Validation", () => {
  it("should have ANTHROPIC_API_KEY environment variable set", () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
  });

  it("should have valid Anthropic API key format", () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    // Anthropic API keys start with "sk-ant-"
    expect(apiKey).toMatch(/^sk-ant-/);
  });

  it("should have API key with sufficient length", () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    // Anthropic API keys are typically 100+ characters
    expect(apiKey!.length).toBeGreaterThan(50);
  });
});
