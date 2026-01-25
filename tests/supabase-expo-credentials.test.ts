import { describe, it, expect } from "vitest";

describe("Supabase Expo Public Credentials Validation", () => {
  it("should have EXPO_PUBLIC_SUPABASE_URL environment variable set", () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(supabaseUrl).toBeDefined();
    expect(supabaseUrl).not.toBe("");
    expect(supabaseUrl).toMatch(/^https:\/\/.*\.supabase\.co$/);
  });

  it("should have EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable set", () => {
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(supabaseKey).toBeDefined();
    expect(supabaseKey).not.toBe("");
    // Supabase anon keys are JWT tokens that start with "eyJ"
    expect(supabaseKey).toMatch(/^eyJ/);
  });

  it("should be able to connect to Supabase with Expo credentials", async () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    // Test connection by making a health check request
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        "apikey": supabaseKey!,
        "Authorization": `Bearer ${supabaseKey}`,
      },
    });
    
    // A 200 response indicates successful connection
    expect(response.status).toBe(200);
  });
});
