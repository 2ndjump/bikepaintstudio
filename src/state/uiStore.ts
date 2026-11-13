import { create } from 'zustand';

export type Lang = 'de' | 'en';
/** 'camera' spins the bike / pans / zooms; 'edit' drags text/shape layers on the model. */
export type Tool = 'camera' | 'edit';

/** Starter set of session favourites — freely editable via the Palette panel. */
const DEFAULT_PALETTE = ['#1a1a1a', '#e8e8e8', '#c62828', '#1565c0', '#2e7d32', '#f9a825'];

interface UIState {
  lang: Lang;
  /** Session-scoped favourite colours, shown as quick-picks in every ColorPicker. */
  palette: string[];
  /** Divider currently being edited — only its guide line + handles are shown. */
  activeDividerId: string | null;
  /** Active viewport tool: orbit the bike, or drag text/shape layers. */
  tool: Tool;
  /** Wheel designer: the preview wheel turns by itself (pause/play). */
  wheelSpin: boolean;
  setLang(lang: Lang): void;
  addPaletteColor(color: string): void;
  removePaletteColor(color: string): void;
  setPalette(palette: string[]): void;
  setActiveDividerId(id: string | null): void;
  setTool(tool: Tool): void;
  setWheelSpin(on: boolean): void;
}

export const useUIStore = create<UIState>((set) => ({
  lang: 'de',
  palette: DEFAULT_PALETTE,
  activeDividerId: null,
  tool: 'camera',
  wheelSpin: true,
  setLang: (lang) => set({ lang }),
  setActiveDividerId: (activeDividerId) => set({ activeDividerId }),
  setTool: (tool) => set({ tool }),
  setWheelSpin: (wheelSpin) => set({ wheelSpin }),
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
