import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({ user: null }),
}));

const mockOrder = vi.fn();
const mockEq = vi.fn(() => ({ order: mockOrder }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(() => ({ select: mockSelect })) },
}));

import { useAuth } from "@/hooks/useAuth";
import { useDogs } from "@/hooks/useDogs";
import { supabase } from "@/integrations/supabase/client";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useDogs", () => {
  it("does not fetch when user is null", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });
    renderHook(() => useDogs(), { wrapper: createWrapper() });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("fetches dogs when user is present", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: "u1" } });
    const dogs = [{ id: "d1", name: "Rex", user_id: "u1" }];
    mockOrder.mockResolvedValue({ data: dogs, error: null });

    const { result } = renderHook(() => useDogs(), { wrapper: createWrapper() });
    await vi.waitFor(() => expect(result.current.data).toBeDefined());
    expect(supabase.from).toHaveBeenCalledWith("dogs");
    expect(result.current.data).toEqual(dogs);
  });
});
