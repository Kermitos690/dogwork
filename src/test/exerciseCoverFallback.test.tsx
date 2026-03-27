import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExerciseCoverFallback } from "@/components/ExerciseCoverFallback";

describe("ExerciseCoverFallback", () => {
  it("renders with exercise name", () => {
    render(<ExerciseCoverFallback name="Rappel de base" />);
    expect(screen.getByText("Rappel de base")).toBeInTheDocument();
  });

  it("renders category icon when provided", () => {
    render(<ExerciseCoverFallback name="Test" categoryIcon="🐕" />);
    expect(screen.getByText("🐕")).toBeInTheDocument();
  });

  it("produces deterministic gradient for same name", () => {
    const { container: c1 } = render(<ExerciseCoverFallback name="Assis" />);
    const { container: c2 } = render(<ExerciseCoverFallback name="Assis" />);
    expect(c1.firstElementChild?.className).toBe(c2.firstElementChild?.className);
  });

  it("does not show name text for sm size", () => {
    render(<ExerciseCoverFallback name="Hidden Name" size="sm" />);
    expect(screen.queryByText("Hidden Name")).not.toBeInTheDocument();
  });

  it("renders with lg size", () => {
    render(<ExerciseCoverFallback name="Large Ex" size="lg" />);
    expect(screen.getByText("Large Ex")).toBeInTheDocument();
  });
});
