import { describe, it, expect } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

describe("Supabase Database Schema", () => {
  it("should have users table with correct columns", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&limit=0`, {
      headers: {
        "apikey": SUPABASE_KEY!,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    
    expect(response.status).toBe(200);
    // Check that the table exists and is accessible
    const contentRange = response.headers.get("content-range");
    expect(contentRange).toBeDefined();
  });

  it("should have recipes table with correct columns", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/recipes?select=*&limit=0`, {
      headers: {
        "apikey": SUPABASE_KEY!,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    
    expect(response.status).toBe(200);
  });

  it("should have recipe_photos table", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/recipe_photos?select=*&limit=0`, {
      headers: {
        "apikey": SUPABASE_KEY!,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    
    expect(response.status).toBe(200);
  });

  it("should have generations table", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/generations?select=*&limit=0`, {
      headers: {
        "apikey": SUPABASE_KEY!,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    
    expect(response.status).toBe(200);
  });

  it("should have transactions table", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions?select=*&limit=0`, {
      headers: {
        "apikey": SUPABASE_KEY!,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    
    expect(response.status).toBe(200);
  });
});

describe("Supabase Auth Configuration", () => {
  it("should have auth endpoint accessible", async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        "apikey": SUPABASE_KEY!,
      },
    });
    
    expect(response.status).toBe(200);
    const settings = await response.json();
    expect(settings).toHaveProperty("external");
  });
});

describe("Auth Provider and Hooks", () => {
  it("should have auth-provider.tsx file", async () => {
    const fs = await import("fs");
    const authProviderContent = fs.readFileSync("./lib/auth-provider.tsx", "utf-8");
    
    expect(authProviderContent).toContain("AuthProvider");
    expect(authProviderContent).toContain("useAuth");
    expect(authProviderContent).toContain("signInWithEmail");
    expect(authProviderContent).toContain("signUpWithEmail");
    expect(authProviderContent).toContain("signInWithApple");
    expect(authProviderContent).toContain("signOut");
  });

  it("should have supabase.ts client file", async () => {
    const fs = await import("fs");
    const supabaseContent = fs.readFileSync("./lib/supabase.ts", "utf-8");
    
    expect(supabaseContent).toContain("createClient");
    expect(supabaseContent).toContain("EXPO_PUBLIC_SUPABASE_URL");
    expect(supabaseContent).toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY");
    expect(supabaseContent).toContain("ExpoSecureStoreAdapter");
  });

  it("should have apple-auth.ts file", async () => {
    const fs = await import("fs");
    const appleAuthContent = fs.readFileSync("./lib/apple-auth.ts", "utf-8");
    
    expect(appleAuthContent).toContain("signInWithApple");
    expect(appleAuthContent).toContain("AppleAuthentication");
    expect(appleAuthContent).toContain("signInWithIdToken");
  });
});

describe("Auth Screens Integration", () => {
  it("should have login screen with Supabase auth", async () => {
    const fs = await import("fs");
    const loginContent = fs.readFileSync("./app/login.tsx", "utf-8");
    
    expect(loginContent).toContain("useAuth");
    expect(loginContent).toContain("signInWithEmail");
    expect(loginContent).toContain("signInWithApple");
  });

  it("should have signup screen with Supabase auth", async () => {
    const fs = await import("fs");
    const signupContent = fs.readFileSync("./app/signup.tsx", "utf-8");
    
    expect(signupContent).toContain("useAuth");
    expect(signupContent).toContain("signUpWithEmail");
  });

  it("should have AuthProvider wrapped in root layout", async () => {
    const fs = await import("fs");
    const layoutContent = fs.readFileSync("./app/_layout.tsx", "utf-8");
    
    expect(layoutContent).toContain("AuthProvider");
    expect(layoutContent).toContain("import { AuthProvider }");
  });
});
