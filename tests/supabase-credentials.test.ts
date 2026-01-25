import { describe, it, expect } from "vitest";

describe("Supabase Credentials Validation", () => {
  it("should have SUPABASE_URL environment variable set", () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    expect(supabaseUrl).toBeDefined();
    expect(supabaseUrl).not.toBe("");
    expect(supabaseUrl).toMatch(/^https:\/\/.*\.supabase\.co$/);
  });

  it("should have SUPABASE_ANON_KEY environment variable set", () => {
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    expect(supabaseKey).toBeDefined();
    expect(supabaseKey).not.toBe("");
    // Supabase anon keys are JWT tokens that start with "eyJ" or custom prefixes
    expect(supabaseKey!.length).toBeGreaterThan(20);
  });

  it("should be able to connect to Supabase", async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    // Test connection by making a health check request
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        "apikey": supabaseKey!,
        "Authorization": `Bearer ${supabaseKey}`,
      },
    });
    
    // A 200 response indicates successful connection
    // (even if no tables exist yet, the endpoint should respond)
    expect(response.status).toBe(200);
  });
});
