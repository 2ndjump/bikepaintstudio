import { create } from 'zustand';

export type Lang = 'de' | 'en';
export type BackgroundMode = 'dark' | 'light' | 'studio';

interface UIState {
  lang: Lang;
  background: BackgroundMode;
  setLang(lang: Lang): void;
  setBackground(background: BackgroundMode): void;
}

export const useUIStore = create<UIState>((set) => ({
  lang: 'de',
  background: 'dark',
  setLang: (lang) => set({ lang }),
  setBackground: (background) => set({ background }),
}));
