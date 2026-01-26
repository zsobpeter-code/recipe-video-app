/**
 * Video Concatenation Service
 * 
 * Uses FFmpeg to merge individual step videos into a single video file
 * for sharing on TikTok/Instagram.
 */

import { FFmpegKit, ReturnCode } from "ffmpeg-kit-react-native";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export interface ConcatResult {
  localPath: string;
  success: boolean;
  error?: string;
}

export interface ConcatProgress {
  status: "downloading" | "preparing" | "merging" | "complete" | "failed";
  message: string;
  progress?: number;
}

/**
 * Check if FFmpeg is available on this platform
 * FFmpeg is only available on native iOS/Android, not web
 */
export function isFFmpegAvailable(): boolean {
  return Platform.OS !== "web";
}

/**
 * Concatenate multiple step videos into a single video file
 * 
 * @param stepVideoUrls - Array of HTTPS URLs for step videos (in order)
 * @param recipeId - Recipe ID for naming the output file
 * @param onProgress - Callback for progress updates
 * @returns ConcatResult with local path to the merged video
 */
export async function concatenateStepVideos(
  stepVideoUrls: string[],
  recipeId: string,
  onProgress?: (progress: ConcatProgress) => void
): Promise<ConcatResult> {
  // Check platform support
  if (!isFFmpegAvailable()) {
    return {
      localPath: "",
      success: false,
      error: "Video concatenation is only available on iOS/Android devices",
    };
  }

  // Filter out empty URLs
  const validUrls = stepVideoUrls.filter(url => url && url.startsWith("https://"));
  
  if (validUrls.length === 0) {
    return {
      localPath: "",
      success: false,
      error: "No valid video URLs to concatenate",
    };
  }

  if (validUrls.length === 1) {
    // Only one video, no need to concatenate
    // Download it directly
    onProgress?.({ status: "downloading", message: "Downloading video..." });
    
    const localPath = `${FileSystem.cacheDirectory}final_${recipeId}.mp4`;
    
    try {
      const download = await FileSystem.downloadAsync(validUrls[0], localPath);
      if (download.status === 200) {
        onProgress?.({ status: "complete", message: "Video ready!" });
        return { localPath, success: true };
      } else {
        return { localPath: "", success: false, error: "Failed to download video" };
      }
    } catch (error: any) {
      return { localPath: "", success: false, error: error?.message || "Download failed" };
    }
  }

  const localPaths: string[] = [];
  
  try {
    // 1. Download all step videos to local cache
    onProgress?.({ status: "downloading", message: "Downloading videos...", progress: 0 });
    
    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i];
      const localPath = `${FileSystem.cacheDirectory}step_${i}_${recipeId}.mp4`;
      
      onProgress?.({
        status: "downloading",
        message: `Downloading step ${i + 1}/${validUrls.length}...`,
        progress: Math.round((i / validUrls.length) * 50),
      });
      
      console.log(`[FFmpeg] Downloading step ${i + 1}: ${url.substring(0, 80)}...`);
      
      const download = await FileSystem.downloadAsync(url, localPath);
      
      if (download.status === 200) {
        localPaths.push(localPath);
        console.log(`[FFmpeg] Downloaded step ${i + 1} to: ${localPath}`);
      } else {
        console.error(`[FFmpeg] Failed to download step ${i + 1}: status ${download.status}`);
      }
    }
    
    if (localPaths.length === 0) {
      return {
        localPath: "",
        success: false,
        error: "Failed to download any videos",
      };
    }
    
    if (localPaths.length === 1) {
      // Only one video downloaded successfully
      onProgress?.({ status: "complete", message: "Video ready!" });
      return { localPath: localPaths[0], success: true };
    }
    
    // 2. Create FFmpeg concat file list
    onProgress?.({ status: "preparing", message: "Preparing videos...", progress: 50 });
    
    const listPath = `${FileSystem.cacheDirectory}concat_list_${recipeId}.txt`;
    const listContent = localPaths.map(p => `file '${p}'`).join("\n");
    await FileSystem.writeAsStringAsync(listPath, listContent);
    
    console.log(`[FFmpeg] Concat list created: ${listPath}`);
    console.log(`[FFmpeg] List content:\n${listContent}`);
    
    // 3. Run FFmpeg concatenation
    onProgress?.({ status: "merging", message: "Merging videos...", progress: 60 });
    
    const outputPath = `${FileSystem.cacheDirectory}final_${recipeId}.mp4`;
    
    // Delete output if exists
    try {
      await FileSystem.deleteAsync(outputPath, { idempotent: true });
    } catch (e) {
      // Ignore deletion errors
    }
    
    // FFmpeg concat command
    // -f concat: use concat demuxer
    // -safe 0: allow absolute paths
    // -i: input file list
    // -c copy: copy streams without re-encoding (fast)
    const ffmpegCommand = `-f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;
    
    console.log(`[FFmpeg] Running command: ${ffmpegCommand}`);
    
    const session = await FFmpegKit.execute(ffmpegCommand);
    const returnCode = await session.getReturnCode();
    
    if (ReturnCode.isSuccess(returnCode)) {
      console.log(`[FFmpeg] Success! Output: ${outputPath}`);
      
      // Verify output file exists
      const fileInfo = await FileSystem.getInfoAsync(outputPath);
      if (fileInfo.exists) {
        onProgress?.({ status: "complete", message: "Video ready!", progress: 100 });
        
        // Clean up temp files
        await cleanupTempFiles(localPaths, listPath);
        
        return { localPath: outputPath, success: true };
      } else {
        return {
          localPath: "",
          success: false,
          error: "Output file not created",
        };
      }
    } else {
      // Get FFmpeg logs for debugging
      const logs = await session.getAllLogs();
      const logMessages = logs.map(log => log.getMessage()).join("\n");
      console.error(`[FFmpeg] Failed with logs:\n${logMessages}`);
      
      return {
        localPath: "",
        success: false,
        error: "Video concatenation failed",
      };
    }
    
  } catch (error: any) {
    console.error(`[FFmpeg] Error:`, error);
    
    // Clean up on error
    await cleanupTempFiles(localPaths, `${FileSystem.cacheDirectory}concat_list_${recipeId}.txt`);
    
    return {
      localPath: "",
      success: false,
      error: error?.message || "Unknown error during concatenation",
    };
  }
}

/**
 * Clean up temporary files after concatenation
 */
async function cleanupTempFiles(localPaths: string[], listPath: string): Promise<void> {
  try {
    for (const path of localPaths) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
    await FileSystem.deleteAsync(listPath, { idempotent: true });
    console.log(`[FFmpeg] Cleaned up ${localPaths.length + 1} temp files`);
  } catch (error) {
    console.warn(`[FFmpeg] Error cleaning up temp files:`, error);
  }
}

/**
 * Get the size of a local video file
 */
export async function getVideoFileSize(localPath: string): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    return (fileInfo as any).size || 0;
  } catch {
    return 0;
  }
}

/**
 * Delete a local video file
 */
export async function deleteLocalVideo(localPath: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(localPath, { idempotent: true });
  } catch (error) {
    console.warn(`[FFmpeg] Error deleting video:`, error);
  }
}
