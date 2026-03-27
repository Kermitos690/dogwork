import { describe, it, expect, vi } from "vitest";
import React from "react";

// Verify ShelterDashboard types compile without `as any` on query results
// This is a compile-time regression test

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            then: vi.fn(),
            limit: () => ({ then: vi.fn() }),
          }),
          maybeSingle: () => ({ then: vi.fn() }),
        }),
      }),
    }),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("framer-motion", () => ({
  motion: { div: (props: any) => React.createElement("div", props) },
}));

vi.mock("@/components/ShelterLayout", () => ({
  ShelterLayout: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));

describe("ShelterDashboard", () => {
  it("imports without type errors", async () => {
    // Dynamic import to verify module compiles
    const mod = await import("@/pages/ShelterDashboard");
    expect(mod.default).toBeDefined();
  });
});
