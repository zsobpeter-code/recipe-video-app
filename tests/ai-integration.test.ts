import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("AI Integration Tests", () => {
  describe("Recipe Analysis tRPC Route", () => {
    it("should have recipe router defined in routers.ts", () => {
      const routersPath = path.join(process.cwd(), "server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      
      expect(content).toContain("recipe: router({");
      expect(content).toContain("analyze: publicProcedure");
    });

    it("should have proper input schema for analyze endpoint", () => {
      const routersPath = path.join(process.cwd(), "server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      
      expect(content).toContain("imageBase64: z.string()");
      expect(content).toContain("dishName: z.string().optional()");
      expect(content).toContain("userNotes: z.string().optional()");
    });

    it("should use invokeLLM for AI analysis", () => {
      const routersPath = path.join(process.cwd(), "server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      
      expect(content).toContain("import { invokeLLM }");
      expect(content).toContain("await invokeLLM({");
    });

    it("should have proper recipe response schema", () => {
      const routersPath = path.join(process.cwd(), "server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      
      expect(content).toContain("dishName: z.string()");
      expect(content).toContain("ingredients: z.array(");
      expect(content).toContain("steps: z.array(");
      expect(content).toContain("prepTime: z.number()");
      expect(content).toContain("cookTime: z.number()");
      expect(content).toContain("servings: z.number()");
    });

    it("should handle errors gracefully", () => {
      const routersPath = path.join(process.cwd(), "server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      
      expect(content).toContain("catch (error)");
      expect(content).toContain("success: false");
      expect(content).toContain("recipe: null");
    });
  });

  describe("Recipe Card Screen", () => {
    it("should exist at app/recipe-card.tsx", () => {
      const screenPath = path.join(process.cwd(), "app/recipe-card.tsx");
      expect(fs.existsSync(screenPath)).toBe(true);
    });

    it("should have proper component structure", () => {
      const screenPath = path.join(process.cwd(), "app/recipe-card.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("export default function RecipeCardScreen");
      expect(content).toContain("useLocalSearchParams");
      expect(content).toContain("useRouter");
    });

    it("should parse recipe data from params", () => {
      const screenPath = path.join(process.cwd(), "app/recipe-card.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("params.ingredients");
      expect(content).toContain("params.steps");
      expect(content).toContain("JSON.parse");
    });

    it("should have expandable sections for ingredients and steps", () => {
      const screenPath = path.join(process.cwd(), "app/recipe-card.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("ingredientsExpanded");
      expect(content).toContain("toggleIngredients");
      expect(content).toContain("toggleSteps");
      expect(content).toContain("ingredients");
      expect(content).toContain("steps");
    });

    it("should have action buttons for video generation and save", () => {
      const screenPath = path.join(process.cwd(), "app/recipe-card.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("Video");
      expect(content).toContain("Save");
      expect(content).toContain("handleGenerateTikTokVideo");
      expect(content).toContain("handleSaveToCollection");
      expect(content).toContain("handleShareVideo");
    });

    it("should use LinearGradient for premium CTA styling", () => {
      const screenPath = path.join(process.cwd(), "app/recipe-card.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("LinearGradient");
    });

    it("should display recipe stats (time, servings, difficulty)", () => {
      const screenPath = path.join(process.cwd(), "app/recipe-card.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("totalTime");
      expect(content).toContain("servings");
      expect(content).toContain("difficulty");
    });
  });

  describe("Processing Screen AI Connection", () => {
    it("should import trpc client", () => {
      const screenPath = path.join(process.cwd(), "app/processing.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("import { trpc }");
    });

    it("should use recipe.analyze mutation", () => {
      const screenPath = path.join(process.cwd(), "app/processing.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("trpc.recipe.analyze.useMutation");
    });

    it("should convert image to base64", () => {
      const screenPath = path.join(process.cwd(), "app/processing.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("imageBase64");
      expect(content).toContain("FileSystem.readAsStringAsync");
    });

    it("should navigate to refinement screen on success", () => {
      const screenPath = path.join(process.cwd(), "app/processing.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("router.replace");
      expect(content).toContain("/refinement");
    });

    it("should handle errors with user feedback", () => {
      const screenPath = path.join(process.cwd(), "app/processing.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("setError");
      expect(content).toContain("onError");
    });
  });

  describe("Navigation Configuration", () => {
    it("should have recipe-card screen in Stack navigator", () => {
      const layoutPath = path.join(process.cwd(), "app/_layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");
      
      expect(content).toContain('name="recipe-card"');
    });
  });

  describe("Icon Mappings", () => {
    it("should have all required icons for recipe card", () => {
      const iconPath = path.join(process.cwd(), "components/ui/icon-symbol.tsx");
      const content = fs.readFileSync(iconPath, "utf-8");
      
      const requiredIcons = [
        "list.bullet",
        "list.number",
        "chevron.up",
        "chevron.down",
        "bookmark.fill",
        "video.fill",
      ];
      
      requiredIcons.forEach((icon) => {
        expect(content).toContain(`"${icon}"`);
      });
    });
  });
});

  describe("Refinement Screen", () => {
    it("should have refinement screen file", () => {
      const screenPath = path.join(process.cwd(), "app/refinement.tsx");
      expect(fs.existsSync(screenPath)).toBe(true);
    });

    it("should show confidence score", () => {
      const screenPath = path.join(process.cwd(), "app/refinement.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("confidence");
    });

    it("should have Yes/No buttons for dish confirmation", () => {
      const screenPath = path.join(process.cwd(), "app/refinement.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("Yes");
      expect(content).toContain("No");
    });

    it("should allow manual dish name correction", () => {
      const screenPath = path.join(process.cwd(), "app/refinement.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("TextInput");
      expect(content).toContain("correctedName");
    });

    it("should show alternative suggestions", () => {
      const screenPath = path.join(process.cwd(), "app/refinement.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("alternatives");
    });

    it("should navigate to recipe-card on confirm (V2.1 flow)", () => {
      const screenPath = path.join(process.cwd(), "app/refinement.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("/recipe-card");
    });

    it("should be registered in Stack navigator", () => {
      const layoutPath = path.join(process.cwd(), "app/_layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");
      
      expect(content).toContain('name="refinement"');
    });
  });
