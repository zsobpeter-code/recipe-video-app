// Storage helpers using Supabase Storage
// Uploads files to Supabase Storage bucket

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase credentials missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const bucketName = "generated-files";

  // Convert data to Buffer if needed
  const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);

  try {
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(key, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(key);

    const url = publicUrlData.publicUrl;

    return { key, url };
  } catch (error) {
    throw new Error(
      `Storage upload failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const bucketName = "generated-files";

  try {
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(key);

    const url = publicUrlData.publicUrl;

    return { key, url };
  } catch (error) {
    throw new Error(
      `Storage get failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}
