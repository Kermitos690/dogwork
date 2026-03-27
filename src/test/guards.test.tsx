import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ── Mock Supabase ──
const mockRpc = vi.fn();
const mockSupabase = {
  rpc: mockRpc,
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

// ── Mock useAuth ──
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Mock react-router-dom ──
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => {
    mockNavigate(to);
    return React.createElement("div", { "data-testid": "navigate", "data-to": to });
  },
  useLocation: () => ({ pathname: "/coach" }),
}));

// ── Mock hooks ──
vi.mock("@/hooks/useCoach", () => ({
  useIsCoach: () => ({ data: false, isLoading: false }),
  useIsShelter: () => ({ data: false, isLoading: false }),
  useIsShelterEmployee: () => ({ data: false, isLoading: false }),
}));

vi.mock("@/hooks/useEducatorSubscription", () => ({
  useEducatorSubscription: () => ({ subscribed: true, loading: false }),
}));

// ── Mock react-query ──
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === "is_admin") {
      return { data: false, isLoading: false };
    }
    return { data: null, isLoading: false };
  },
}));

// ── Import guards after mocks ──
import { AdminGuard } from "@/components/AdminGuard";
import { CoachGuard } from "@/components/CoachGuard";
import { ShelterGuard } from "@/components/ShelterGuard";
import { EmployeeGuard } from "@/components/EmployeeGuard";

describe("AdminGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });
    mockRpc.mockResolvedValue({ data: false });
  });

  it("redirects non-admin users to /", () => {
    render(
      React.createElement(AdminGuard, null, React.createElement("div", null, "Admin Content"))
    );
    const nav = screen.getByTestId("navigate");
    expect(nav.getAttribute("data-to")).toBe("/");
  });

  it("does not render children when not admin", () => {
    render(
      React.createElement(AdminGuard, null, React.createElement("div", null, "Admin Content"))
    );
    expect(screen.queryByText("Admin Content")).toBeNull();
  });
});

describe("CoachGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });
  });

  it("redirects non-coach users to /", () => {
    render(
      React.createElement(CoachGuard, null, React.createElement("div", null, "Coach Content"))
    );
    const nav = screen.getByTestId("navigate");
    expect(nav.getAttribute("data-to")).toBe("/");
  });
});

describe("ShelterGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });
  });

  it("redirects non-shelter users to /", () => {
    render(
      React.createElement(ShelterGuard, null, React.createElement("div", null, "Shelter Content"))
    );
    const nav = screen.getByTestId("navigate");
    expect(nav.getAttribute("data-to")).toBe("/");
  });
});

describe("EmployeeGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });
  });

  it("redirects non-employee users to /", () => {
    render(
      React.createElement(EmployeeGuard, null, React.createElement("div", null, "Employee Content"))
    );
    const nav = screen.getByTestId("navigate");
    expect(nav.getAttribute("data-to")).toBe("/");
  });
});
