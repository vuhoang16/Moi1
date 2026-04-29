import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, AuthTokens } from '@rentapp/shared';
import { api } from '../api/client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  saveTokens: (tokens: AuthTokens) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),

  saveTokens: async (tokens) => {
    await SecureStore.setItemAsync('access_token', tokens.accessToken);
    await SecureStore.setItemAsync('refresh_token', tokens.refreshToken);
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null });
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        const { data } = await api.get('/auth/me');
        set({ user: data });
      }
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
    } finally {
      set({ isLoading: false });
    }
  },
}));
