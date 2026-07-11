import { create } from 'zustand';

export type Lang = 'de' | 'en';
export type BackgroundMode = 'dark' | 'light';
/** 'camera' orbits/pans the bike; 'edit' drags text/shape layers on the model. */
export type Tool = 'camera' | 'edit';

/** Starter set of session favourites — freely editable via the Palette panel. */
const DEFAULT_PALETTE = ['#1a1a1a', '#e8e8e8', '#c62828', '#1565c0', '#2e7d32', '#f9a825'];

interface UIState {
  lang: Lang;
  background: BackgroundMode;
  /** Session-scoped favourite colours, shown as quick-picks in every ColorPicker. */
  palette: string[];
  /** Divider currently being edited — only its guide line + handles are shown. */
  activeDividerId: string | null;
  /** Active viewport tool: orbit the bike, or drag text/shape layers. */
  tool: Tool;
  setLang(lang: Lang): void;
  setBackground(background: BackgroundMode): void;
  addPaletteColor(color: string): void;
  removePaletteColor(color: string): void;
  setPalette(palette: string[]): void;
  setActiveDividerId(id: string | null): void;
  setTool(tool: Tool): void;
}

export const useUIStore = create<UIState>((set) => ({
  lang: 'de',
  background: 'dark',
  palette: DEFAULT_PALETTE,
  activeDividerId: null,
  tool: 'camera',
  setLang: (lang) => set({ lang }),
  setBackground: (background) => set({ background }),
  setActiveDividerId: (activeDividerId) => set({ activeDividerId }),
  setTool: (tool) => set({ tool }),
  addPaletteColor: (color) =>
    set((s) => {
      const c = color.toLowerCase();
      if (s.palette.some((x) => x.toLowerCase() === c)) return s; // dedupe
      return { palette: [...s.palette, c] };
    }),
  removePaletteColor: (color) =>
    set((s) => ({ palette: s.palette.filter((x) => x.toLowerCase() !== color.toLowerCase()) })),
  setPalette: (palette) => set({ palette }),
}));
