import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the storage path from a photo_url.
 * Handles both legacy full public URLs and plain paths.
 */
function extractPath(photoUrl: string): string {
  // If it's a full Supabase URL, extract the path after /dog-photos/
  const marker = "/object/public/dog-photos/";
  const signedMarker = "/object/sign/dog-photos/";
  for (const m of [marker, signedMarker]) {
    const idx = photoUrl.indexOf(m);
    if (idx !== -1) {
      const path = photoUrl.substring(idx + m.length).split("?")[0];
      return decodeURIComponent(path);
    }
  }
  // Already a plain path
  return photoUrl;
}

/**
 * Returns a signed URL for a dog photo.
 * Falls back to the original URL if signing fails.
 */
export async function getSignedPhotoUrl(
  photoUrl: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  if (!photoUrl) return null;
  const path = extractPath(photoUrl);
  const { data, error } = await supabase.storage
    .from("dog-photos")
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    // Fallback for legacy or broken URLs
    return photoUrl;
  }
  return data.signedUrl;
}

/**
 * Uploads a photo and returns the storage path (not the full URL).
 */
export async function uploadDogPhoto(
  file: File,
  userId: string,
  dogId: string
): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${dogId}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("dog-photos")
    .upload(path, file, { upsert: true });
  if (error) {
    console.error("Photo upload failed:", error);
    return null;
  }
  // Return the signed URL to store in DB
  const { data } = await supabase.storage
    .from("dog-photos")
    .createSignedUrl(path, 86400 * 365); // 1 year
  return data?.signedUrl ?? path;
}
