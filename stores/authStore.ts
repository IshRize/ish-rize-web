/**
 * Module: authStore
 * Layer:  store (Zustand)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Client-side auth state. Mirrors the mobile authStore's shape and
 *          responsibilities, minus token handling — the JWT lives only in the
 *          httpOnly cookie set by /api/auth/login, never in this store.
 */
import { create } from 'zustand';
import { authApi } from '@/lib/api';
import type { User } from '@/types/scheduling';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  loadUser(): Promise<void>;
  clearError(): void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  async login(email, password) {
    set({ isLoading: true, error: null });
    try {
      const { user } = await authApi.login(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Login failed', isLoading: false });
      throw err;
    }
  },

  async logout() {
    await authApi.logout();
    set({ user: null, isAuthenticated: false });
  },

  async loadUser() {
    set({ isLoading: true });
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError() {
    set({ error: null });
  },
}));
