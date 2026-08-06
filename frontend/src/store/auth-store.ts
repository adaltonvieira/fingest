import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string } | null;
  setTokens: (accessToken: string, refreshToken: string, user?: { id: string; email: string }) => void;
  logout: () => void;
}

const STORAGE_KEY = 'fingest_auth';

function loadInitial(): Pick<AuthState, 'accessToken' | 'refreshToken' | 'user'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null, user: null };
    return JSON.parse(raw);
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitial(),
  setTokens: (accessToken, refreshToken, user) => {
    set((state) => {
      const next = { accessToken, refreshToken, user: user ?? state.user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
