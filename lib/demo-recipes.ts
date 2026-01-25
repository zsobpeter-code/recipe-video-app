/**
 * Demo recipes for testing the app flow.
 * These are pre-populated recipes that can be loaded for demonstration purposes.
 */

export interface DemoRecipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  category: "Main" | "Soup" | "Dessert" | "Appetizer" | "Breakfast";
  difficulty: "Easy" | "Medium" | "Hard";
  prepTime: number;
  cookTime: number;
  servings: number;
  imageUrl: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit?: string;
  }>;
  steps: string[];
  tags: string[];
  isFavorite: boolean;
}

export const DEMO_RECIPES: DemoRecipe[] = [
  {
    id: "demo-1",
    title: "Classic Spaghetti Carbonara",
    description: "A creamy Italian pasta dish with crispy pancetta, eggs, and Parmesan cheese.",
    cuisine: "Italian",
    category: "Main",
    difficulty: "Medium",
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    imageUrl: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800",
    ingredients: [
      { name: "Spaghetti", amount: "400", unit: "g" },
      { name: "Pancetta", amount: "200", unit: "g" },
      { name: "Eggs", amount: "4", unit: "large" },
      { name: "Parmesan cheese", amount: "100", unit: "g" },
      { name: "Black pepper", amount: "2", unit: "tsp" },
      { name: "Salt", amount: "1", unit: "tsp" },
      { name: "Olive oil", amount: "2", unit: "tbsp" },
    ],
    steps: [
      "Bring a large pot of salted water to boil and cook spaghetti according to package directions.",
      "While pasta cooks, cut pancetta into small cubes and fry in a large pan until crispy.",
      "In a bowl, whisk together eggs, grated Parmesan, and plenty of black pepper.",
      "Reserve 1 cup of pasta water, then drain the spaghetti.",
      "Remove pan from heat, add hot pasta to pancetta, and quickly toss with egg mixture.",
      "Add pasta water as needed to create a creamy sauce. Serve immediately with extra Parmesan.",
    ],
    tags: ["pasta", "italian", "quick", "comfort food"],
    isFavorite: true,
  },
  {
    id: "demo-2",
    title: "Thai Green Curry",
    description: "Aromatic coconut curry with vegetables and your choice of protein.",
    cuisine: "Thai",
    category: "Main",
    difficulty: "Medium",
    prepTime: 20,
    cookTime: 25,
    servings: 4,
    imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800",
    ingredients: [
      { name: "Green curry paste", amount: "3", unit: "tbsp" },
      { name: "Coconut milk", amount: "400", unit: "ml" },
      { name: "Chicken breast", amount: "500", unit: "g" },
      { name: "Thai basil", amount: "1", unit: "cup" },
      { name: "Bamboo shoots", amount: "200", unit: "g" },
      { name: "Fish sauce", amount: "2", unit: "tbsp" },
      { name: "Palm sugar", amount: "1", unit: "tbsp" },
      { name: "Thai eggplant", amount: "4", unit: "pieces" },
    ],
    steps: [
      "Heat a wok over high heat and add 2 tablespoons of coconut cream.",
      "Fry the green curry paste for 2 minutes until fragrant.",
      "Add sliced chicken and cook until no longer pink on the outside.",
      "Pour in the remaining coconut milk and bring to a simmer.",
      "Add bamboo shoots, eggplant, fish sauce, and palm sugar.",
      "Simmer for 15 minutes until chicken is cooked through.",
      "Stir in Thai basil leaves and serve over jasmine rice.",
    ],
    tags: ["thai", "curry", "spicy", "coconut"],
    isFavorite: false,
  },
  {
    id: "demo-3",
    title: "Creamy Tomato Soup",
    description: "Velvety smooth tomato soup with fresh basil and a touch of cream.",
    cuisine: "American",
    category: "Soup",
    difficulty: "Easy",
    prepTime: 10,
    cookTime: 30,
    servings: 6,
    imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800",
    ingredients: [
      { name: "Canned tomatoes", amount: "800", unit: "g" },
      { name: "Onion", amount: "1", unit: "large" },
      { name: "Garlic", amount: "4", unit: "cloves" },
      { name: "Vegetable broth", amount: "500", unit: "ml" },
      { name: "Heavy cream", amount: "100", unit: "ml" },
      { name: "Fresh basil", amount: "1/2", unit: "cup" },
      { name: "Butter", amount: "2", unit: "tbsp" },
    ],
    steps: [
      "Melt butter in a large pot and sauté diced onion until translucent.",
      "Add minced garlic and cook for 1 minute until fragrant.",
      "Pour in canned tomatoes and vegetable broth, bring to a boil.",
      "Reduce heat and simmer for 20 minutes.",
      "Use an immersion blender to puree until smooth.",
      "Stir in heavy cream and fresh basil. Season with salt and pepper.",
      "Serve hot with crusty bread or grilled cheese sandwiches.",
    ],
    tags: ["soup", "vegetarian", "comfort food", "easy"],
    isFavorite: true,
  },
  {
    id: "demo-4",
    title: "Chocolate Lava Cake",
    description: "Decadent individual chocolate cakes with a molten center.",
    cuisine: "French",
    category: "Dessert",
    difficulty: "Medium",
    prepTime: 15,
    cookTime: 12,
    servings: 4,
    imageUrl: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800",
    ingredients: [
      { name: "Dark chocolate", amount: "200", unit: "g" },
      { name: "Butter", amount: "100", unit: "g" },
      { name: "Eggs", amount: "2", unit: "large" },
      { name: "Egg yolks", amount: "2", unit: "large" },
      { name: "Sugar", amount: "100", unit: "g" },
      { name: "All-purpose flour", amount: "50", unit: "g" },
      { name: "Vanilla extract", amount: "1", unit: "tsp" },
    ],
    steps: [
      "Preheat oven to 425°F (220°C). Butter and flour 4 ramekins.",
      "Melt chocolate and butter together in a double boiler.",
      "In a bowl, whisk eggs, egg yolks, and sugar until thick and pale.",
      "Fold the chocolate mixture into the egg mixture.",
      "Sift in flour and fold gently until just combined.",
      "Divide batter among ramekins and bake for 12 minutes.",
      "Let cool for 1 minute, then invert onto plates. Serve immediately.",
    ],
    tags: ["dessert", "chocolate", "french", "impressive"],
    isFavorite: false,
  },
  {
    id: "demo-5",
    title: "Avocado Toast with Poached Egg",
    description: "Trendy breakfast classic with creamy avocado and perfectly poached eggs.",
    cuisine: "Modern",
    category: "Breakfast",
    difficulty: "Easy",
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800",
    ingredients: [
      { name: "Sourdough bread", amount: "2", unit: "slices" },
      { name: "Ripe avocado", amount: "1", unit: "large" },
      { name: "Eggs", amount: "2", unit: "large" },
      { name: "Lemon juice", amount: "1", unit: "tsp" },
      { name: "Red pepper flakes", amount: "1/4", unit: "tsp" },
      { name: "Everything bagel seasoning", amount: "1", unit: "tsp" },
      { name: "White vinegar", amount: "1", unit: "tbsp" },
    ],
    steps: [
      "Toast the sourdough bread until golden and crispy.",
      "Mash avocado with lemon juice, salt, and pepper.",
      "Bring a pot of water to a gentle simmer, add vinegar.",
      "Create a whirlpool and gently drop in each egg. Poach for 3 minutes.",
      "Spread mashed avocado generously on toast.",
      "Top with poached egg, red pepper flakes, and everything seasoning.",
      "Serve immediately while egg is still runny.",
    ],
    tags: ["breakfast", "healthy", "quick", "trendy"],
    isFavorite: true,
  },
  {
    id: "demo-6",
    title: "Japanese Miso Ramen",
    description: "Rich and savory miso-based ramen with chashu pork and soft-boiled egg.",
    cuisine: "Japanese",
    category: "Soup",
    difficulty: "Hard",
    prepTime: 30,
    cookTime: 60,
    servings: 4,
    imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
    ingredients: [
      { name: "Ramen noodles", amount: "400", unit: "g" },
      { name: "White miso paste", amount: "4", unit: "tbsp" },
      { name: "Chicken broth", amount: "1.5", unit: "L" },
      { name: "Chashu pork", amount: "8", unit: "slices" },
      { name: "Soft-boiled eggs", amount: "4", unit: "halves" },
      { name: "Green onions", amount: "4", unit: "stalks" },
      { name: "Corn kernels", amount: "1/2", unit: "cup" },
      { name: "Nori sheets", amount: "4", unit: "pieces" },
    ],
    steps: [
      "Prepare the broth by simmering chicken stock with aromatics for 30 minutes.",
      "Whisk miso paste into the hot broth until fully dissolved.",
      "Cook ramen noodles according to package directions, drain well.",
      "Prepare soft-boiled eggs by cooking for exactly 6.5 minutes, then ice bath.",
      "Slice chashu pork and briefly sear in a hot pan.",
      "Divide noodles among bowls, ladle hot miso broth over.",
      "Top with chashu, halved egg, corn, green onions, and nori. Serve hot.",
    ],
    tags: ["japanese", "ramen", "soup", "comfort food"],
    isFavorite: false,
  },
];

/**
 * Get demo recipes formatted for the app's recipe list
 */
export function getDemoRecipesForList() {
  return DEMO_RECIPES.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    imageUrl: recipe.imageUrl,
    category: recipe.category,
    cookTime: recipe.cookTime,
    isFavorite: recipe.isFavorite,
  }));
}

/**
 * Get a single demo recipe by ID
 */
export function getDemoRecipeById(id: string): DemoRecipe | undefined {
  return DEMO_RECIPES.find((recipe) => recipe.id === id);
}
