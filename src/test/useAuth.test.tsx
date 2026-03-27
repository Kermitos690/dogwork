import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({}),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children);

describe("useAuth", () => {
  it("starts with null user", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("signIn calls supabase", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.signIn("test@test.com", "pass");
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@test.com", password: "pass",
    });
  });

  it("signUp calls supabase with metadata", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.signUp("t@t.com", "pass", "Name");
    });
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "t@t.com", password: "pass" })
    );
  });

  it("signOut calls supabase", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.signOut(); });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("throws outside provider", () => {
    expect(() => renderHook(() => useAuth())).toThrow();
  });
});
