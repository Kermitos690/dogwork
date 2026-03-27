import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Mock auth ──
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Mock Supabase ──
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useDogs } from "@/hooks/useDogs";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useDogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("does not fetch when user is null", () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useDogs(), { wrapper: createWrapper() });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("fetches dogs when user is present", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-123" } });
    const mockDogs = [
      { id: "dog-1", name: "Rex", user_id: "user-123", is_active: true },
      { id: "dog-2", name: "Bella", user_id: "user-123", is_active: false },
    ];
    mockOrder.mockResolvedValue({ data: mockDogs, error: null });

    const { result } = renderHook(() => useDogs(), { wrapper: createWrapper() });

    await vi.waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockFrom).toHaveBeenCalledWith("dogs");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
    expect(result.current.data).toEqual(mockDogs);
  });

  it("throws on supabase error", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-123" } });
    mockOrder.mockResolvedValue({ data: null, error: new Error("DB error") });

    const { result } = renderHook(() => useDogs(), { wrapper: createWrapper() });

    await vi.waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toBe("DB error");
  });
});
