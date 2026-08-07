import { create } from 'zustand';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

const STORAGE_KEY = 'fingest_theme';

function loadInitial(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  } catch {
    return false;
  }
}

function applyClass(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

const initial = loadInitial();
applyClass(initial);

export const useThemeStore = create<ThemeState>((set, get) => ({
  dark: initial,
  toggle: () => {
    const next = !get().dark;
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    applyClass(next);
    set({ dark: next });
  },
}));
