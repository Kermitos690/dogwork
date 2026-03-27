import { describe, it, expect } from "vitest";
import { getPhotoUrl } from "@/lib/photoUrl";

describe("getPhotoUrl", () => {
  it("returns null for null input", () => {
    expect(getPhotoUrl(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(getPhotoUrl(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getPhotoUrl("")).toBeNull();
  });

  it("returns URL as-is if it starts with http", () => {
    const url = "https://example.com/photo.jpg";
    expect(getPhotoUrl(url)).toBe(url);
  });
});
