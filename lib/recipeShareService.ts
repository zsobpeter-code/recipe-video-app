/**
 * Recipe Share Service
 * 
 * Handles sharing recipes as images, PDFs, and videos.
 */

import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { Platform } from "react-native";

export interface RecipeData {
  id?: string;
  dishName: string;
  description?: string;
  cuisine?: string;
  category?: string;
  difficulty?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients?: Array<{ name: string; amount: string }>;
  steps?: string[];
  imageUrl?: string | null;
  stepImages?: Array<{ stepIndex: number; imageUrl: string }>;
  finalVideoUrl?: string | null;
}

/**
 * Generate HTML for recipe PDF
 */
function generateRecipeHTML(recipe: RecipeData): string {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  
  const ingredientsList = recipe.ingredients
    ?.map((i) => `<li style="margin-bottom: 6px; color: #333;">${i.amount} ${i.name}</li>`)
    .join("") || "";
  
  const stepsList = recipe.steps
    ?.map((step, index) => {
      const stepImage = recipe.stepImages?.find((s) => s.stepIndex === index);
      return `
        <div style="margin-bottom: 20px;">
          <p style="margin: 0 0 8px 0; color: #333;">
            <strong style="color: #C9A962;">Step ${index + 1}:</strong> ${step}
          </p>
          ${
            stepImage
              ? `<img src="${stepImage.imageUrl}" style="width: 100%; max-width: 400px; border-radius: 8px; margin-top: 8px;" />`
              : ""
          }
        </div>
      `;
    })
    .join("") || "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
          background: #FFFFFF;
          color: #1A1A1A;
        }
        h1 {
          font-size: 28px;
          color: #1A1A1A;
          margin: 0 0 8px 0;
          font-weight: 700;
        }
        h2 {
          font-size: 18px;
          color: #C9A962;
          margin: 24px 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #C9A962;
        }
        .hero-image {
          width: 100%;
          max-height: 300px;
          object-fit: cover;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
          padding: 12px;
          background: #F5F5F5;
          border-radius: 8px;
        }
        .meta-item {
          font-size: 14px;
          color: #666;
        }
        .meta-item strong {
          color: #C9A962;
        }
        .cuisine-badge {
          display: inline-block;
          background: #C9A962;
          color: #1A1A1A;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        ul {
          padding-left: 20px;
          margin: 0;
        }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #E0E0E0;
          text-align: center;
          color: #888;
          font-size: 12px;
        }
        .footer span {
          color: #C9A962;
        }
      </style>
    </head>
    <body>
      ${recipe.imageUrl ? `<img src="${recipe.imageUrl}" class="hero-image" />` : ""}
      
      ${recipe.cuisine ? `<div class="cuisine-badge">${recipe.cuisine}</div>` : ""}
      
      <h1>${recipe.dishName}</h1>
      
      ${recipe.description ? `<p style="color: #666; margin: 0 0 16px 0;">${recipe.description}</p>` : ""}
      
      <div class="meta">
        ${totalTime > 0 ? `<div class="meta-item"><strong>⏱</strong> ${totalTime} min total</div>` : ""}
        ${recipe.prepTime ? `<div class="meta-item"><strong>Prep:</strong> ${recipe.prepTime} min</div>` : ""}
        ${recipe.cookTime ? `<div class="meta-item"><strong>Cook:</strong> ${recipe.cookTime} min</div>` : ""}
        ${recipe.servings ? `<div class="meta-item"><strong>Servings:</strong> ${recipe.servings}</div>` : ""}
        ${recipe.difficulty ? `<div class="meta-item"><strong>Difficulty:</strong> ${recipe.difficulty}</div>` : ""}
      </div>
      
      ${
        ingredientsList
          ? `
        <h2>Ingredients</h2>
        <ul>${ingredientsList}</ul>
      `
          : ""
      }
      
      ${
        stepsList
          ? `
        <h2>Instructions</h2>
        ${stepsList}
      `
          : ""
      }
      
      <div class="footer">
        Created with <span>✨ Dishcraft</span>
      </div>
    </body>
    </html>
  `;
}

/**
 * Share recipe as PDF
 */
export async function shareRecipePDF(recipe: RecipeData): Promise<{ success: boolean; error?: string }> {
  try {
    const html = generateRecipeHTML(recipe);
    
    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: "Sharing is not available on this device" };
    }
    
    // Rename file to have a proper name
    const pdfPath = `${FileSystem.cacheDirectory}${recipe.dishName.replace(/[^a-zA-Z0-9]/g, "_")}_recipe.pdf`;
    await FileSystem.moveAsync({ from: uri, to: pdfPath });
    
    // Share the PDF
    await Sharing.shareAsync(pdfPath, {
      mimeType: "application/pdf",
      dialogTitle: `Share ${recipe.dishName} Recipe`,
      UTI: "com.adobe.pdf",
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("[ShareService] PDF share error:", error);
    return { success: false, error: error?.message || "Failed to share PDF" };
  }
}

/**
 * Share recipe card image with full recipe text
 */
export async function shareRecipeCardImage(
  imageUri: string,
  recipe: RecipeData
): Promise<{ success: boolean; error?: string }> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: "Sharing is not available on this device" };
    }
    
    // Create full recipe text to share along with image
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    const ingredientsText = recipe.ingredients
      ?.map((i) => `• ${i.amount} ${i.name}`)
      .join("\n") || "";
    const stepsText = recipe.steps
      ?.map((s, i) => `${i + 1}. ${s}`)
      .join("\n") || "";
    
    const recipeText = `
${recipe.dishName}
${recipe.description ? `\n${recipe.description}` : ""}

📝 Ingredients:
${ingredientsText}

👨‍🍳 Instructions:
${stepsText}

⏱ ${totalTime > 0 ? `${totalTime} min` : ""} | 👥 ${recipe.servings || 4} servings

Made with Dishcraft ✨
    `.trim();
    
    // On iOS, we can share both image and text
    // On Android, Share API handles this differently
    if (Platform.OS === "ios") {
      // iOS: Share image with message
      const { Share } = await import("react-native");
      await Share.share({
        message: recipeText,
        url: imageUri,
      });
    } else {
      // Android/Web: Share image via Sharing API, then text via Share API
      await Sharing.shareAsync(imageUri, {
        mimeType: "image/png",
        dialogTitle: `Share ${recipe.dishName}`,
        UTI: "public.png",
      });
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("[ShareService] Image share error:", error);
    return { success: false, error: error?.message || "Failed to share image" };
  }
}

/**
 * Share AI-generated photo
 */
export async function shareAIPhoto(
  imageUrl: string,
  dishName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!imageUrl) {
      return { success: false, error: "No image URL provided" };
    }
    
    if (!imageUrl.startsWith("https://")) {
      return { success: false, error: "Invalid image URL - must be HTTPS" };
    }
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: "Sharing is not available on this device" };
    }
    
    // Download image to local cache
    const safeDishName = (dishName || "recipe").replace(/[^a-zA-Z0-9]/g, "_");
    const localPath = `${FileSystem.cacheDirectory}${safeDishName}_ai_photo.jpg`;
    
    let download;
    try {
      download = await FileSystem.downloadAsync(imageUrl, localPath);
    } catch (downloadError) {
      console.error("[ShareService] Download error:", downloadError);
      return { success: false, error: "Failed to download image from server" };
    }
    
    if (!download || download.status !== 200) {
      return { success: false, error: `Failed to download image (status: ${download?.status || "unknown"})` };
    }
    
    await Sharing.shareAsync(localPath, {
      mimeType: "image/jpeg",
      dialogTitle: `Share ${dishName} AI Photo`,
      UTI: "public.jpeg",
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("[ShareService] AI photo share error:", error);
    return { success: false, error: error?.message || "Failed to share AI photo" };
  }
}

/**
 * Share final video
 */
export async function shareVideo(
  videoUrl: string,
  dishName: string,
  isLocalPath: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: "Sharing is not available on this device" };
    }
    
    let localPath = videoUrl;
    
    // If it's a remote URL, download first
    if (!isLocalPath && videoUrl.startsWith("https://")) {
      localPath = `${FileSystem.cacheDirectory}${dishName.replace(/[^a-zA-Z0-9]/g, "_")}_video.mp4`;
      const download = await FileSystem.downloadAsync(videoUrl, localPath);
      
      if (download.status !== 200) {
        return { success: false, error: "Failed to download video" };
      }
    }
    
    await Sharing.shareAsync(localPath, {
      mimeType: "video/mp4",
      dialogTitle: `Share ${dishName} Cooking Video`,
      UTI: "public.mpeg-4",
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("[ShareService] Video share error:", error);
    return { success: false, error: error?.message || "Failed to share video" };
  }
}

/**
 * Save video to camera roll
 */
export async function saveVideoToCameraRoll(
  videoUrl: string,
  dishName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Import MediaLibrary dynamically to avoid issues on web
    const MediaLibrary = await import("expo-media-library");
    
    // Request permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      return { success: false, error: "Permission to access media library was denied" };
    }
    
    let localPath = videoUrl;
    
    // If it's a remote URL, download first
    if (videoUrl.startsWith("https://")) {
      localPath = `${FileSystem.cacheDirectory}${dishName.replace(/[^a-zA-Z0-9]/g, "_")}_video_save.mp4`;
      const download = await FileSystem.downloadAsync(videoUrl, localPath);
      
      if (download.status !== 200) {
        return { success: false, error: "Failed to download video" };
      }
    }
    
    // Save to camera roll
    const asset = await MediaLibrary.createAssetAsync(localPath);
    
    if (asset) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to save video to camera roll" };
    }
  } catch (error: any) {
    console.error("[ShareService] Save video error:", error);
    return { success: false, error: error?.message || "Failed to save video" };
  }
}

/**
 * Check if sharing is available
 */
export async function isSharingAvailable(): Promise<boolean> {
  return await Sharing.isAvailableAsync();
}
