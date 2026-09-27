// Auth session store (zustand + localStorage persistence).
// Access tokens are short-lived; the refresh flow is handled by the API client.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, bindTokenSource } from '../api/client';
import type { AuthUser, SessionResponse } from '../types/api';
import { ROLE_HOME } from '../lib/constants';

export type AuthStatus = 'loading' | 'authed' | 'anon';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: AuthStatus;
  setSession: (s: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
  setUser: (u: AuthUser) => void;
  logout: (callApi?: boolean) => Promise<void>;
  hydrate: () => Promise<void>;
  homePath: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      status: 'loading',

      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken, status: 'authed' }),

      setUser: (user) => set({ user }),

      logout: async (callApi = true) => {
        const rt = get().refreshToken;
        if (callApi && rt) {
          await api.post('/auth/logout', { refreshToken: rt }).catch(() => undefined);
        }
        set({ user: null, accessToken: null, refreshToken: null, status: 'anon' });
      },

      hydrate: async () => {
        const { accessToken, refreshToken } = get();
        if (!accessToken && !refreshToken) {
          set({ status: 'anon' });
          return;
        }
        try {
          const user = await api.get<AuthUser>('/auth/me');
          set({ user, status: 'authed' });
        } catch {
          set({ user: null, accessToken: null, refreshToken: null, status: 'anon' });
        }
      },

      homePath: () => ROLE_HOME[get().user?.role ?? ''] ?? '/',
    }),
    {
      name: 'vortex-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.hydrate();
      },
    },
  ),
);

// Wire the API client to this store (tokens + refresh-failure handling)
bindTokenSource({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (accessToken, refreshToken) =>
    useAuthStore.setState((s) => ({ accessToken, refreshToken, user: s.user })),
  onRefreshFailed: () =>
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, status: 'anon' }),
});

// ── Auth API actions used by pages ──
export interface LoginInput { email: string; password: string }
export interface RegisterInput {
  fullName: string; email: string; password: string; phone?: string;
  role: 'FARMER' | 'EXPERT';
  village?: string; district?: string; state?: string; farmSizeAcres?: number;
  specialization?: string; qualification?: string; licenseNumber?: string;
  yearsExperience?: number; bio?: string;
}

export async function loginAction(input: LoginInput) {
  const res = await api.post<SessionResponse>('/auth/login', input);
  useAuthStore.getState().setSession(res);
  return res.user;
}

export async function registerAction(input: RegisterInput) {
  const res = await api.post<SessionResponse>('/auth/register', input);
  if (!res.pendingApproval && res.accessToken) {
    useAuthStore.getState().setSession(res);
  }
  return res;
}
