import { describe, it, expect, vi } from "vitest";

// Mock supabase before importing
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.url" }, error: null }),
        upload: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}));

import { getSignedPhotoUrl } from "@/lib/photoUrl";

describe("getSignedPhotoUrl", () => {
  it("returns null for null input", async () => {
    expect(await getSignedPhotoUrl(null)).toBeNull();
  });

  it("returns null for undefined input", async () => {
    expect(await getSignedPhotoUrl(undefined)).toBeNull();
  });

  it("returns null for empty string", async () => {
    expect(await getSignedPhotoUrl("")).toBeNull();
  });

  it("returns a signed URL for a valid path", async () => {
    const result = await getSignedPhotoUrl("user123/dog456.jpg");
    expect(result).toBeTruthy();
  });
});
