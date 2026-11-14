import { create } from 'zustand';

export type Lang = 'de' | 'en';

/** Starter set of session favourites — freely editable via the Palette panel. */
const DEFAULT_PALETTE = ['#1a1a1a', '#e8e8e8', '#c62828', '#1565c0', '#2e7d32', '#f9a825'];

/** The template strip's open/closed choice, remembered per browser. */
const GALLERY_KEY = 'bps.galleryOpen';
function readGalleryOpen(): boolean {
  try {
    return localStorage.getItem(GALLERY_KEY) !== '0';
  } catch {
    return true;
  }
}

interface UIState {
  lang: Lang;
  /** Session-scoped favourite colours, shown as quick-picks in every ColorPicker. */
  palette: string[];
  /** Divider currently being edited — only its guide line + handles are shown. */
  activeDividerId: string | null;
  /** Layer (of the active zone) being edited: expanded in the panel, with
   *  move/scale/rotate handles on the model. */
  selectedLayerId: string | null;
  /** Wheel designer: the preview wheel turns by itself (pause/play). */
  wheelSpin: boolean;
  /** Wheel designer: riding speed the preview wheel turns at (km/h). */
  wheelKmh: number;
  /** Template strip at the bottom edge shown. */
  galleryOpen: boolean;
  /** Holds the wheel still while the pointer is on a layer handle or a layer
   *  is being dragged, so a moving target can be grabbed. */
  spinHold: boolean;
  /** True while a PNG is captured: on-canvas guides and highlights hide. */
  capturing: boolean;
  setLang(lang: Lang): void;
  addPaletteColor(color: string): void;
  removePaletteColor(color: string): void;
  setPalette(palette: string[]): void;
  setActiveDividerId(id: string | null): void;
  setSelectedLayerId(id: string | null): void;
  setWheelSpin(on: boolean): void;
  setWheelKmh(kmh: number): void;
  setGalleryOpen(open: boolean): void;
  setSpinHold(on: boolean): void;
  setCapturing(on: boolean): void;
}

export const useUIStore = create<UIState>((set) => ({
  lang: 'de',
  palette: DEFAULT_PALETTE,
  activeDividerId: null,
  selectedLayerId: null,
  wheelSpin: true,
  wheelKmh: 1,
  galleryOpen: readGalleryOpen(),
  spinHold: false,
  capturing: false,
  setLang: (lang) => set({ lang }),
  setActiveDividerId: (activeDividerId) => set({ activeDividerId }),
  setSelectedLayerId: (selectedLayerId) => set({ selectedLayerId }),
  setWheelSpin: (wheelSpin) => set({ wheelSpin }),
  setWheelKmh: (wheelKmh) => set({ wheelKmh }),
  setGalleryOpen: (galleryOpen) => {
    try {
      localStorage.setItem(GALLERY_KEY, galleryOpen ? '1' : '0');
    } catch {
      // storage blocked: the choice just isn't remembered
    }
    set({ galleryOpen });
  },
  setSpinHold: (spinHold) => set({ spinHold }),
  setCapturing: (capturing) => set({ capturing }),
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
