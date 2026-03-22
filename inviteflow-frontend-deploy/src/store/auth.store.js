// ============================================================
//  Auth Store — Zustand
//  src/store/auth.store.js
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:  null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const { data } = await authAPI.login(credentials);
        localStorage.setItem('inviteflow_token', data.token);
        set({ user: data.user, token: data.token, isAuthenticated: true });
        return data;
      },

      logout: async () => {
        try { await authAPI.logout(); } catch {}
        localStorage.removeItem('inviteflow_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        try {
          const { data } = await authAPI.getMe();
          set({ user: data.data });
        } catch {
          get().logout();
        }
      },
    }),
    { name: 'inviteflow-auth', partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);
