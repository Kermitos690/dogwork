import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mocks must use inline values (no top-level variables referenced in factory)
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn().mockResolvedValue({ data: false }) },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => React.createElement("div", { "data-testid": "navigate", "data-to": to }),
  useLocation: () => ({ pathname: "/coach" }),
}));

vi.mock("@/hooks/useCoach", () => ({
  useIsCoach: () => ({ data: false, isLoading: false }),
  useIsShelter: () => ({ data: false, isLoading: false }),
  useIsShelterEmployee: () => ({ data: false, isLoading: false }),
}));

vi.mock("@/hooks/useEducatorSubscription", () => ({
  useEducatorSubscription: () => ({ subscribed: true, loading: false }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: false, isLoading: false }),
}));

import { AdminGuard } from "@/components/AdminGuard";
import { CoachGuard } from "@/components/CoachGuard";
import { ShelterGuard } from "@/components/ShelterGuard";
import { EmployeeGuard } from "@/components/EmployeeGuard";

describe("AdminGuard", () => {
  it("redirects non-admin users to /", () => {
    render(React.createElement(AdminGuard, null, React.createElement("div", null, "Admin Content")));
    expect(screen.getByTestId("navigate").getAttribute("data-to")).toBe("/");
    expect(screen.queryByText("Admin Content")).toBeNull();
  });
});

describe("CoachGuard", () => {
  it("redirects non-coach users to /", () => {
    render(React.createElement(CoachGuard, null, React.createElement("div", null, "Coach Content")));
    expect(screen.getByTestId("navigate").getAttribute("data-to")).toBe("/");
  });
});

describe("ShelterGuard", () => {
  it("redirects non-shelter users to /", () => {
    render(React.createElement(ShelterGuard, null, React.createElement("div", null, "Shelter Content")));
    expect(screen.getByTestId("navigate").getAttribute("data-to")).toBe("/");
  });
});

describe("EmployeeGuard", () => {
  it("redirects non-employee users to /", () => {
    render(React.createElement(EmployeeGuard, null, React.createElement("div", null, "Employee Content")));
    expect(screen.getByTestId("navigate").getAttribute("data-to")).toBe("/");
  });
});
