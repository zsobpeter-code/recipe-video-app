/**
 * TikTok Video Prompt Builder
 * 
 * Constructs Runway Gen-4.5 optimized prompts from structured recipe data.
 * Designed for cinematic, vertical (9:16) food videos.
 */

export interface TikTokPromptInput {
  title: string;
  ingredients: Array<{ name: string; amount?: string; unit?: string }>;
  steps: Array<{ instruction: string; stepNumber?: number }>;
  cuisineStyle?: string;
  heroMoment?: string;
}

/**
 * Extract cooking techniques from recipe steps
 */
function extractTechniques(steps: Array<{ instruction: string }>): string[] {
  const techniques: string[] = [];
  const techniqueMap: Record<string, string> = {
    sear: "sizzling, golden crust forming, foaming butter, wisps of smoke",
    fry: "golden bubbles, crispy edges forming, oil shimmering",
    sauté: "ingredients dancing in the pan, butter foaming, gentle sizzle",
    simmer: "gentle bubbles rising, steam swirling, rich sauce thickening",
    boil: "rolling boil, steam billowing, vigorous bubbles",
    bake: "golden-brown surface, oven warmth, rising dough",
    roast: "caramelized edges, rendered fat glistening, deep golden color",
    grill: "char marks forming, flames licking, smoke rising",
    braise: "tender meat falling apart, rich braising liquid, aromatic steam",
    chop: "precise knife cuts, ingredients tumbling, fresh colors",
    whisk: "smooth emulsion forming, ingredients blending, creamy texture",
    fold: "gentle incorporation, airy mixture, delicate movement",
    knead: "elastic dough stretching, flour dusting, rhythmic motion",
    plate: "elegant drizzle of sauce, precise garnish placement, final steam",
    garnish: "fresh herbs placed delicately, finishing drizzle, perfect presentation",
    pour: "liquid cascading smoothly, creating ripples, glossy finish",
    stir: "circular motion, ingredients melding, colors blending",
    blend: "smooth transformation, vibrant colors swirling, creamy result",
    caramelize: "sugar melting to amber, glossy surface, sweet aroma visible in steam",
    flambe: "dramatic flames, alcohol burning off, golden glow",
    reduce: "sauce concentrating, glossy sheen, steam rising steadily",
    marinate: "liquid coating evenly, herbs and spices settling, glistening surface",
    toast: "golden color developing, nutty aroma visible in warmth, crispy texture",
    steam: "delicate steam rising, food gently cooking, moisture beading",
    glaze: "glossy coating applied, shiny surface, dripping edges",
  };

  for (const step of steps) {
    const instruction = step.instruction.toLowerCase();
    for (const [keyword, visual] of Object.entries(techniqueMap)) {
      if (instruction.includes(keyword) && !techniques.includes(visual)) {
        techniques.push(visual);
      }
    }
  }

  // If no specific techniques found, use a generic cooking visual
  if (techniques.length === 0) {
    techniques.push("smooth cooking motion, professional kitchen ambiance, appetizing preparation");
  }

  return techniques.slice(0, 3); // Max 3 technique visuals
}

/**
 * Extract color palette from ingredients
 */
function extractColorPalette(ingredients: Array<{ name: string }>): string {
  const colorMap: Record<string, string> = {
    tomato: "rich reds",
    pepper: "vibrant reds and greens",
    basil: "fresh greens",
    lemon: "bright yellows",
    turmeric: "warm golden",
    saffron: "deep golden",
    paprika: "warm orange-red",
    spinach: "deep greens",
    carrot: "warm orange",
    blueberry: "deep purple-blue",
    avocado: "creamy green",
    chocolate: "rich dark brown",
    cream: "ivory white",
    butter: "warm golden yellow",
    salmon: "coral pink",
    shrimp: "coral orange",
    egg: "golden yolk",
    mushroom: "earthy brown",
    garlic: "pale ivory",
    onion: "translucent amber",
    honey: "liquid amber gold",
    mint: "cool green",
    cilantro: "bright green",
    parsley: "fresh green",
    cheese: "golden melted",
  };

  const colors: string[] = [];
  for (const ingredient of ingredients) {
    const name = ingredient.name.toLowerCase();
    for (const [keyword, color] of Object.entries(colorMap)) {
      if (name.includes(keyword) && !colors.includes(color)) {
        colors.push(color);
      }
    }
  }

  if (colors.length === 0) {
    return "warm, appetizing earth tones";
  }

  return colors.slice(0, 3).join(", ");
}

/**
 * Get cuisine-specific visual style
 */
function getCuisineStyle(cuisine?: string): string {
  if (!cuisine) return "warm food photography lighting, professional kitchen setting";

  const cuisineStyles: Record<string, string> = {
    italian: "rustic Mediterranean warmth, wooden surfaces, olive oil glistening, terracotta tones",
    japanese: "minimalist zen presentation, clean lines, delicate porcelain, natural wood",
    french: "elegant fine dining, copper cookware, precise technique, rich sauces",
    mexican: "vibrant colors, rustic clay, fresh lime, colorful garnishes",
    indian: "warm spice tones, brass vessels, aromatic steam, rich golden colors",
    thai: "tropical freshness, wok flames, vibrant herbs, coconut cream",
    chinese: "wok hei flames, bamboo steamers, glossy sauces, chopstick presentation",
    korean: "banchan arrangement, sizzling stone bowls, fermented richness, neat presentation",
    mediterranean: "sun-drenched colors, fresh herbs, olive oil drizzle, rustic charm",
    american: "hearty comfort, cast iron, melted cheese, generous portions",
    middle_eastern: "warm spices, flatbread, tahini drizzle, jewel-toned ingredients",
  };

  const lowerCuisine = cuisine.toLowerCase();
  for (const [key, style] of Object.entries(cuisineStyles)) {
    if (lowerCuisine.includes(key)) {
      return style;
    }
  }

  return "warm food photography lighting, professional kitchen setting";
}

/**
 * Build a Runway-optimized prompt for TikTok video generation
 * 
 * Template pattern:
 * "Cinematic close-up food video of [title]. [technique-specific visuals from steps]. 
 *  [color palette from ingredients]. [heroMoment description]. 
 *  Warm food photography lighting. No hands visible. 9:16 vertical."
 */
export function buildTikTokVideoPrompt(input: TikTokPromptInput): string {
  const techniques = extractTechniques(input.steps);
  const colorPalette = extractColorPalette(input.ingredients);
  const cuisineStyle = getCuisineStyle(input.cuisineStyle);

  // Build technique visuals string
  const techniqueVisuals = techniques.join(". ");

  // Build hero moment description
  const heroMoment = input.heroMoment
    ? input.heroMoment
    : `The finished ${input.title} presented beautifully`;

  // Construct the final prompt
  const prompt = [
    `Cinematic close-up food video of ${input.title}.`,
    techniqueVisuals + ".",
    `Color palette: ${colorPalette}.`,
    `${cuisineStyle}.`,
    `${heroMoment}.`,
    "Warm food photography lighting, shallow depth of field.",
    "No hands visible, no text overlays.",
    "Smooth slow camera movement, professional 4K quality.",
    "9:16 vertical format, TikTok cooking video style.",
  ].join(" ");

  // Runway has a prompt length limit — trim if needed
  if (prompt.length > 500) {
    return prompt.substring(0, 497) + "...";
  }

  return prompt;
}

/**
 * Build an alternate prompt for regeneration (different seed/angle)
 * Used when the first generation doesn't meet quality threshold
 */
export function buildAlternatePrompt(input: TikTokPromptInput): string {
  const techniques = extractTechniques(input.steps);
  const colorPalette = extractColorPalette(input.ingredients);

  // Use a different camera angle and emphasis
  const prompt = [
    `Overhead cinematic food video of ${input.title} being prepared.`,
    techniques.length > 0 ? techniques[0] + "." : "",
    `Rich ${colorPalette} tones.`,
    `Final plated dish with steam rising, garnish detail.`,
    "Dramatic top-down camera slowly pulling back.",
    "Moody warm lighting, bokeh background.",
    "No hands, no text. Professional food cinematography.",
    "9:16 vertical, TikTok style.",
  ].filter(Boolean).join(" ");

  if (prompt.length > 500) {
    return prompt.substring(0, 497) + "...";
  }

  return prompt;
}
