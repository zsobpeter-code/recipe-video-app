import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Phase 3: Collection Features", () => {
  describe("tRPC Recipe CRUD Routes", () => {
    it("should have recipe router with CRUD operations", () => {
      const routersPath = path.join(process.cwd(), "server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      
      expect(content).toContain("recipe: router({");
      expect(content).toContain("save: publicProcedure");
      expect(content).toContain("list: publicProcedure");
      expect(content).toContain("get: publicProcedure");
      expect(content).toContain("delete: publicProcedure");
      expect(content).toContain("toggleFavorite: publicProcedure");
    });

    it("should have uploadImage route for storage", () => {
      const routersPath = path.join(process.cwd(), "server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      
      expect(content).toContain("uploadImage: publicProcedure");
      expect(content).toContain("storagePut");
    });

    it("should have proper save input schema", () => {
      const routersPath = path.join(process.cwd(), "server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      
      expect(content).toContain("dishName: z.string()");
      expect(content).toContain("description: z.string()");
      expect(content).toContain("ingredients: z.string()");
      expect(content).toContain("steps: z.string()");
      expect(content).toContain("imageUrl: z.string().optional()");
    });

    it("should support filtering by category and search", () => {
      const routersPath = path.join(process.cwd(), "server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      
      expect(content).toContain("category: z.string().optional()");
      expect(content).toContain("search: z.string().optional()");
      expect(content).toContain("favoritesOnly: z.boolean().optional()");
    });
  });

  describe("Recipe Card Component", () => {
    it("should exist at components/recipe-card.tsx", () => {
      const componentPath = path.join(process.cwd(), "components/recipe-card.tsx");
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it("should have proper props interface", () => {
      const componentPath = path.join(process.cwd(), "components/recipe-card.tsx");
      const content = fs.readFileSync(componentPath, "utf-8");
      
      expect(content).toContain("interface RecipeCardProps");
      expect(content).toContain("id: string");
      expect(content).toContain("dishName: string");
      expect(content).toContain("imageUrl: string | null");
      expect(content).toContain("cookTime: number");
      expect(content).toContain("isFavorite: boolean");
      expect(content).toContain("onPress: () => void");
      expect(content).toContain("onFavoriteToggle: () => void");
      expect(content).toContain("onLongPress?: () => void");
    });

    it("should have favorite button with heart icon", () => {
      const componentPath = path.join(process.cwd(), "components/recipe-card.tsx");
      const content = fs.readFileSync(componentPath, "utf-8");
      
      expect(content).toContain("heart.fill");
      expect(content).toContain("heart");
      expect(content).toContain("favoriteButton");
    });
  });

  describe("Home Screen", () => {
    it("should have recipe grid with FlatList", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/index.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("FlatList");
      expect(content).toContain("numColumns={2}");
    });

    it("should have category filter pills", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/index.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain('CATEGORIES = ["All", "Main", "Soup", "Dessert", "Favorites"]');
      expect(content).toContain("categoryPill");
      expect(content).toContain("selectedCategory");
    });

    it("should have search bar", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/index.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("searchQuery");
      expect(content).toContain("TextInput");
      expect(content).toContain('placeholder="Search recipes..."');
    });

    it("should have empty state", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/index.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("renderEmptyState");
      expect(content).toContain("No Recipes Yet");
    });

    it("should use trpc to fetch recipes", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/index.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("trpc.recipe.list.useQuery");
    });
  });

  describe("Collection Tab", () => {
    it("should have recipe grid with FlatList", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/collection.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("FlatList");
      expect(content).toContain("numColumns={2}");
    });

    it("should have pull-to-refresh", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/collection.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("RefreshControl");
      expect(content).toContain("refreshing");
      expect(content).toContain("onRefresh");
    });

    it("should have favorite toggle", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/collection.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("handleFavoriteToggle");
      expect(content).toContain("toggleFavorite.mutate");
    });

    it("should have empty state", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/collection.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("renderEmptyState");
      expect(content).toContain("Your Collection is Empty");
    });
  });

  describe("Delete Recipe Functionality", () => {
    it("should have long-press handler on Home screen", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/index.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("handleLongPress");
      expect(content).toContain("onLongPress");
    });

    it("should have confirmation dialog", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/index.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("confirmDelete");
      expect(content).toContain("Alert.alert");
      expect(content).toContain("Delete Recipe");
      expect(content).toContain("This action cannot be undone");
    });

    it("should have delete mutation", () => {
      const screenPath = path.join(process.cwd(), "app/(tabs)/index.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("deleteRecipe = trpc.recipe.delete.useMutation");
    });
  });

  describe("Save to Collection Flow", () => {
    it("should have save functionality in recipe-card screen", () => {
      const screenPath = path.join(process.cwd(), "app/recipe-card.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("handleSaveToCollection");
      expect(content).toContain("saveRecipe.mutateAsync");
    });

    it("should upload image before saving", () => {
      const screenPath = path.join(process.cwd(), "app/recipe-card.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("uploadImage.mutateAsync");
    });

    it("should show success confirmation", () => {
      const screenPath = path.join(process.cwd(), "app/recipe-card.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("Recipe Saved!");
      expect(content).toContain("View Collection");
    });

    it("should have saving state indicator", () => {
      const screenPath = path.join(process.cwd(), "app/recipe-card.tsx");
      const content = fs.readFileSync(screenPath, "utf-8");
      
      expect(content).toContain("isSaving");
      expect(content).toContain("setIsSaving");
      expect(content).toContain("ActivityIndicator");
    });
  });

  describe("Icon Mappings", () => {
    it("should have all required icons for collection features", () => {
      const iconPath = path.join(process.cwd(), "components/ui/icon-symbol.tsx");
      const content = fs.readFileSync(iconPath, "utf-8");
      
      const requiredIcons = [
        "magnifyingglass",
        "trash.fill",
        "heart.fill",
        "heart",
        "photo.fill",
      ];
      
      requiredIcons.forEach((icon) => {
        expect(content).toContain(`"${icon}"`);
      });
    });
  });
});
