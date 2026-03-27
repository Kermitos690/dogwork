import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ExerciseCoverFallback } from "@/components/ExerciseCoverFallback";

describe("ExerciseCoverFallback", () => {
  it("renders with exercise name", () => {
    const { getByText } = render(<ExerciseCoverFallback name="Rappel de base" />);
    expect(getByText("Rappel de base")).toBeInTheDocument();
  });

  it("renders category icon when provided", () => {
    const { getByText } = render(<ExerciseCoverFallback name="Test" categoryIcon="🐕" />);
    expect(getByText("🐕")).toBeInTheDocument();
  });

  it("produces deterministic gradient for same name", () => {
    const { container: c1 } = render(<ExerciseCoverFallback name="Assis" />);
    const { container: c2 } = render(<ExerciseCoverFallback name="Assis" />);
    expect(c1.firstElementChild?.className).toBe(c2.firstElementChild?.className);
  });

  it("does not show name text for sm size", () => {
    const { queryByText } = render(<ExerciseCoverFallback name="Hidden Name" size="sm" />);
    expect(queryByText("Hidden Name")).not.toBeInTheDocument();
  });

  it("renders with lg size", () => {
    const { getByText } = render(<ExerciseCoverFallback name="Large Ex" size="lg" />);
    expect(getByText("Large Ex")).toBeInTheDocument();
  });
});
