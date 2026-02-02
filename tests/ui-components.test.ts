import { describe, it, expect } from "vitest";

describe("UI Components", () => {
  describe("Theme Configuration", () => {
    it("should have correct primary color (gold accent)", () => {
      const themeConfig = require("../theme.config.js");
      expect(themeConfig.themeColors.primary.light).toBe("#C9A962");
      expect(themeConfig.themeColors.primary.dark).toBe("#C9A962");
    });

    it("should have correct background color (dark charcoal)", () => {
      const themeConfig = require("../theme.config.js");
      expect(themeConfig.themeColors.background.light).toBe("#1A1A1A");
      expect(themeConfig.themeColors.background.dark).toBe("#1A1A1A");
    });

    it("should have correct surface color for glassmorphism", () => {
      const themeConfig = require("../theme.config.js");
      expect(themeConfig.themeColors.surface.light).toBe("#2D2D2D");
      expect(themeConfig.themeColors.surface.dark).toBe("#2D2D2D");
    });

    it("should have correct text colors", () => {
      const themeConfig = require("../theme.config.js");
      expect(themeConfig.themeColors.foreground.light).toBe("#FFFFFF");
      expect(themeConfig.themeColors.muted.light).toBe("#B3B3B3");
      expect(themeConfig.themeColors.subtle.light).toBe("#808080");
    });

    it("should have correct status colors (muted tones)", () => {
      const themeConfig = require("../theme.config.js");
      expect(themeConfig.themeColors.success.light).toBe("#4A7C59");
      expect(themeConfig.themeColors.error.light).toBe("#8B4049");
      expect(themeConfig.themeColors.warning.light).toBe("#C9A962");
    });
  });

  describe("Tailwind Configuration", () => {
    it("should have custom font families defined", () => {
      const tailwindConfig = require("../tailwind.config.js");
      expect(tailwindConfig.theme.extend.fontFamily.serif).toContain("PlayfairDisplay");
      expect(tailwindConfig.theme.extend.fontFamily.sans).toContain("Inter");
      expect(tailwindConfig.theme.extend.fontFamily.handwritten).toContain("Caveat");
    });

    it("should have custom border radius values", () => {
      const tailwindConfig = require("../tailwind.config.js");
      expect(tailwindConfig.theme.extend.borderRadius["2xl"]).toBe("16px");
      expect(tailwindConfig.theme.extend.borderRadius["3xl"]).toBe("24px");
    });
  });

  describe("App Configuration", () => {
    it("should have correct app name", async () => {
      // Read the app.config.ts file content
      const fs = await import("fs");
      const configContent = fs.readFileSync("./app.config.ts", "utf-8");
      expect(configContent).toContain('appName: "Dishcraft');
    });

    it("should have logo URL configured", async () => {
      const fs = await import("fs");
      const configContent = fs.readFileSync("./app.config.ts", "utf-8");
      expect(configContent).toContain("logoUrl:");
      expect(configContent).not.toContain('logoUrl: ""');
    });

    it("should have dark background for splash screen", async () => {
      const fs = await import("fs");
      const configContent = fs.readFileSync("./app.config.ts", "utf-8");
      expect(configContent).toContain('backgroundColor: "#1A1A1A"');
    });
  });
});

describe("Navigation Structure", () => {
  it("should have all required tab screens", async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const tabsDir = "./app/(tabs)";
    const files = fs.readdirSync(tabsDir);
    
    expect(files).toContain("index.tsx");
    expect(files).toContain("capture.tsx");
    expect(files).toContain("collection.tsx");
    expect(files).toContain("profile.tsx");
    expect(files).toContain("_layout.tsx");
  });

  it("should have auth screens", async () => {
    const fs = await import("fs");
    
    const appDir = "./app";
    const files = fs.readdirSync(appDir);
    
    expect(files).toContain("login.tsx");
    expect(files).toContain("signup.tsx");
    expect(files).toContain("onboarding.tsx");
  });
});

describe("Design System Components", () => {
  it("should have all UI components", async () => {
    const fs = await import("fs");
    
    const uiDir = "./components/ui";
    const files = fs.readdirSync(uiDir);
    
    expect(files).toContain("primary-button.tsx");
    expect(files).toContain("secondary-button.tsx");
    expect(files).toContain("glassmorphism-card.tsx");
    expect(files).toContain("text-input.tsx");
    expect(files).toContain("icon-symbol.tsx");
    expect(files).toContain("index.ts");
  });

  it("should export all components from index", async () => {
    const fs = await import("fs");
    const indexContent = fs.readFileSync("./components/ui/index.ts", "utf-8");
    
    expect(indexContent).toContain("PrimaryButton");
    expect(indexContent).toContain("SecondaryButton");
    expect(indexContent).toContain("GlassmorphismCard");
    expect(indexContent).toContain("TextInput");
    expect(indexContent).toContain("IconSymbol");
  });
});

describe("Icon Mappings", () => {
  it("should have all required icon mappings", async () => {
    const fs = await import("fs");
    const iconContent = fs.readFileSync("./components/ui/icon-symbol.tsx", "utf-8");
    
    // Navigation icons
    expect(iconContent).toContain('"house.fill"');
    expect(iconContent).toContain('"camera.fill"');
    expect(iconContent).toContain('"person.fill"');
    expect(iconContent).toContain('"book.fill"');
    
    // Action icons
    expect(iconContent).toContain('"heart.fill"');
    expect(iconContent).toContain('"plus"');
    expect(iconContent).toContain('"play.fill"');
  });
});
