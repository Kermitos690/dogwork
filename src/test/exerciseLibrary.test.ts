import { describe, it, expect } from "vitest";
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES } from "@/data/exerciseLibrary";

describe("exerciseLibrary data integrity", () => {
  it("has exercises", () => {
    expect(EXERCISE_LIBRARY.length).toBeGreaterThan(0);
  });

  it("has categories", () => {
    expect(EXERCISE_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("all exercises have required fields", () => {
    for (const ex of EXERCISE_LIBRARY) {
      expect(ex.id).toBeTruthy();
      expect(ex.slug).toBeTruthy();
      expect(ex.name).toBeTruthy();
      expect(ex.category).toBeTruthy();
      expect(ex.level).toBeTruthy();
    }
  });

  it("all exercise slugs are unique", () => {
    const slugs = EXERCISE_LIBRARY.map(e => e.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("all exercise categories reference valid category keys", () => {
    const categoryKeys = new Set(EXERCISE_CATEGORIES.map(c => c.key));
    for (const ex of EXERCISE_LIBRARY) {
      expect(categoryKeys.has(ex.category)).toBe(true);
    }
  });

  it("all exercises have valid level", () => {
    const validLevels = ["débutant", "intermédiaire", "avancé"];
    for (const ex of EXERCISE_LIBRARY) {
      expect(validLevels).toContain(ex.level);
    }
  });

  it("all exercises have valid exerciseType", () => {
    const validTypes = ["fondation", "ciblé", "bonus", "trick", "récupération", "mental", "relation", "routine"];
    for (const ex of EXERCISE_LIBRARY) {
      expect(validTypes).toContain(ex.exerciseType);
    }
  });

  it("difficulty is between 1 and 5", () => {
    for (const ex of EXERCISE_LIBRARY) {
      expect(ex.difficulty).toBeGreaterThanOrEqual(1);
      expect(ex.difficulty).toBeLessThanOrEqual(5);
    }
  });
});
