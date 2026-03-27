import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

// ── Mock Supabase ──
const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockResetPassword = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPassword,
      updateUser: mockUpdateUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

import { AuthProvider, useAuth } from "@/hooks/useAuth";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children);

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  it("starts with null user and loading false after init", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // After initialization, loading should become false
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("signIn calls supabase signInWithPassword", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const response = await result.current.signIn("test@test.com", "password");
      expect(response.error).toBeNull();
    });

    expect(mockSignIn).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "password",
    });
  });

  it("signUp calls supabase signUp with metadata", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signUp("test@test.com", "password", "TestUser");
    });

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@test.com",
        password: "password",
        options: expect.objectContaining({
          data: { display_name: "TestUser" },
        }),
      })
    );
  });

  it("signOut calls supabase signOut", async () => {
    mockSignOut.mockResolvedValue({});
    const { result } = renderHook(() => useAuth(), { wrapper });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("resetPassword calls supabase resetPasswordForEmail", async () => {
    mockResetPassword.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const response = await result.current.resetPassword("test@test.com");
      expect(response.error).toBeNull();
    });

    expect(mockResetPassword).toHaveBeenCalledWith("test@test.com", expect.any(Object));
  });

  it("throws when used outside AuthProvider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within AuthProvider");
  });
});
