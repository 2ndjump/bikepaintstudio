import { create } from 'zustand';
import {
  ALL_ZONES,
  DEFAULT_CHAMELEON_COLORS,
  type DesignState,
  type Divider,
  type FinishType,
  type Layer,
  type ZoneId,
  type ZoneState,
  makeDefaultZoneState,
} from './types';
import {
  type HistoryState,
  makeEmptyHistory,
  pushHistory,
  snapshotDesign,
} from './history';

// Defaults fill in fields that legacy persisted layers may lack; the spread
// then overrides them with whatever the stored layer actually has. `layer` is
// spread as Partial because at runtime those fields may be absent even though
// the type says otherwise.
function migrateLayer(layer: Layer): Layer {
  if (layer.type === 'image') {
    // Legacy uniform `scale` → per-axis scaleX/scaleY.
    const legacyScale = (layer as { scale?: number }).scale;
    return {
      hueShift: 0,
      dodge: 0,
      burn: 0,
      levelsBlack: 0,
      levelsGamma: 1,
      levelsWhite: 1,
      scaleX: legacyScale ?? 1,
      scaleY: legacyScale ?? 1,
      ...(layer as Partial<typeof layer>),
    } as Layer;
  }
  if (layer.type === 'decal') {
    return { letterSpacing: 0, glyphRotation: 0, ...(layer as Partial<typeof layer>) } as Layer;
  }
  if (layer.type === 'pattern') {
    return {
      rotationX: 0,
      rotationY: 0,
      scaleX: 1,
      scaleY: 1,
      ...(layer as Partial<typeof layer>),
    } as Layer;
  }
  return layer;
}

function migrateZone(zone: Partial<ZoneState> | undefined, fallbackColor: string): ZoneState {
  const base = makeDefaultZoneState(fallbackColor);
  if (!zone) return base;

  // Drop legacy standalone 'distortion' layers — effects are now a per-layer
  // property and there's no clean 1:1 conversion for a stack-wide distortion.
  const rawLayers = zone.layers
    ? zone.layers.filter((l) => (l as { type?: string }).type !== 'distortion')
    : undefined;

  // Legacy designs stored the base color as the bottom-most solid layer.
  // Promote it to the dedicated baseColor field and drop it from the stack.
  let layers = rawLayers ? rawLayers.map(migrateLayer) : base.layers;
  let baseColor = zone.baseColor;
  if (baseColor === undefined && layers.length > 0 && layers[0].type === 'solid') {
    baseColor = layers[0].color;
    layers = layers.slice(1);
  }

  return {
    finish: zone.finish ?? base.finish,
    baseColor: baseColor ?? base.baseColor,
    chameleonColors:
      zone.chameleonColors && zone.chameleonColors.length === 3
        ? ([...zone.chameleonColors] as [string, string, string])
        : ([...DEFAULT_CHAMELEON_COLORS] as [string, string, string]),
    layers,
  };
}

function migrateDesign(state: DesignState): DesignState {
  // Legacy designs split the fork into 'forkLegs' + 'forkCrown'; both now map
  // to the single 'fork' zone (prefer the old legs as the merged source).
  const legacy = (state.zones ?? {}) as Record<string, Partial<ZoneState> | undefined>;
  const zones = Object.fromEntries(
    ALL_ZONES.map((z) => {
      const src = legacy[z] ?? (z === 'fork' ? legacy.forkLegs ?? legacy.forkCrown : undefined);
      return [z, migrateZone(src, '#cccccc')];
    }),
  ) as Record<ZoneId, ZoneState>;
  return {
    activeZone: state.activeZone && ALL_ZONES.includes(state.activeZone) ? state.activeZone : 'topTube',
    zones,
    rim: {
      depth: state.rim?.depth ?? 50,
      width: state.rim?.width ?? 25,
      spokeCount: state.rim?.spokeCount ?? 20,
    },
    dividers: Array.isArray(state.dividers) ? state.dividers : [],
  };
}

function isRimZone(z: ZoneId): boolean {
  return z === 'frontRim' || z === 'rearRim';
}

/**
 * Apply a finish/colour change. Rim zones are independent (only that rim is
 * changed); frame zones are global — changing one updates the whole frame
 * (every non-rim zone) at once.
 */
function applyFrameOrRim(
  zones: Record<ZoneId, ZoneState>,
  target: ZoneId,
  fn: (zone: ZoneState) => ZoneState,
): Record<ZoneId, ZoneState> {
  if (isRimZone(target)) {
    return { ...zones, [target]: fn(zones[target]) };
  }
  return Object.fromEntries(
    (Object.keys(zones) as ZoneId[]).map((z) => [z, isRimZone(z) ? zones[z] : fn(zones[z])]),
  ) as Record<ZoneId, ZoneState>;
}

// All frame zones default to matte gray; rims default to matte black.
const DEFAULT_ZONE_COLORS: Record<ZoneId, string> = {
  headTube: '#888888',
  topTube: '#888888',
  downTube: '#888888',
  seatTube: '#888888',
  seatStays: '#888888',
  chainStays: '#888888',
  fork: '#888888',
  frontRim: '#1a1a1a',
  rearRim: '#1a1a1a',
};

function buildInitialZones(): Record<ZoneId, ZoneState> {
  return Object.fromEntries(
    ALL_ZONES.map((z) => [z, makeDefaultZoneState(DEFAULT_ZONE_COLORS[z])]),
  ) as Record<ZoneId, ZoneState>;
}

export interface DuplicateOptions {
  mirrorH: boolean;
  mirrorV: boolean;
}

interface DesignActions {
  setActiveZone(zone: ZoneId): void;
  setFinish(zone: ZoneId, finish: FinishType): void;
  setBaseColor(zone: ZoneId, color: string): void;
  /** Set the base colour of a single zone only (overrides the global frame
   *  colour for that zone). */
  setZoneBaseColor(zone: ZoneId, color: string): void;
  setChameleonColor(zone: ZoneId, index: 0 | 1 | 2, color: string): void;
  updateLayer(zone: ZoneId, layerId: string, patch: Partial<Layer>): void;
  addLayer(zone: ZoneId, layer: Layer): void;
  removeLayer(zone: ZoneId, layerId: string): void;
  reorderLayer(zone: ZoneId, layerId: string, direction: -1 | 1): void;
  duplicateLayer(zone: ZoneId, layerId: string, options: DuplicateOptions): void;
  setRim(patch: Partial<DesignState['rim']>): void;
  addDivider(): void;
  updateDivider(id: string, patch: Partial<Divider>): void;
  removeDivider(id: string): void;
  loadDesign(state: DesignState): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

interface InternalState {
  history: HistoryState;
}

type Store = DesignState & DesignActions & InternalState;

export const useDesignStore = create<Store>((set, get) => {
  const recordHistory = () => {
    const current = get();
    const snap = snapshotDesign(current);
    return pushHistory(current.history, snap);
  };

  return {
    activeZone: 'topTube',
    zones: buildInitialZones(),
    rim: { depth: 50, width: 25, spokeCount: 20 },
    dividers: [],
    history: makeEmptyHistory(),

    setActiveZone: (zone) => set({ activeZone: zone }),

    // Finish + base/chameleon colours apply to the whole FRAME (all non-rim
    // zones) at once; rim zones are changed individually. Per-zone layers stay
    // independent regardless.
    setFinish: (zone, finish) => {
      const history = recordHistory();
      set((s) => ({
        history,
        zones: applyFrameOrRim(s.zones, zone, (z) => ({ ...z, finish })),
      }));
    },

    setBaseColor: (zone, color) => {
      const history = recordHistory();
      set((s) => ({
        history,
        zones: applyFrameOrRim(s.zones, zone, (z) => ({ ...z, baseColor: color })),
      }));
    },

    // Per-zone override: only this zone's base colour changes.
    setZoneBaseColor: (zone, color) => {
      const history = recordHistory();
      set((s) => ({
        history,
        zones: { ...s.zones, [zone]: { ...s.zones[zone], baseColor: color } },
      }));
    },

    setChameleonColor: (zone, index, color) => {
      const history = recordHistory();
      set((s) => ({
        history,
        zones: applyFrameOrRim(s.zones, zone, (z) => {
          const next = [...z.chameleonColors] as [string, string, string];
          next[index] = color;
          return { ...z, chameleonColors: next };
        }),
      }));
    },

    updateLayer: (zone, layerId, patch) => {
      const history = recordHistory();
      set((s) => ({
        history,
        zones: {
          ...s.zones,
          [zone]: {
            ...s.zones[zone],
            layers: s.zones[zone].layers.map((l) =>
              l.id === layerId ? ({ ...l, ...patch } as Layer) : l,
            ),
          },
        },
      }));
    },

    addLayer: (zone, layer) => {
      const history = recordHistory();
      set((s) => ({
        history,
        zones: {
          ...s.zones,
          [zone]: { ...s.zones[zone], layers: [...s.zones[zone].layers, layer] },
        },
      }));
    },

    removeLayer: (zone, layerId) => {
      const history = recordHistory();
      set((s) => ({
        history,
        zones: {
          ...s.zones,
          [zone]: {
            ...s.zones[zone],
            layers: s.zones[zone].layers.filter((l) => l.id !== layerId),
          },
        },
      }));
    },

    duplicateLayer: (zone, layerId, { mirrorH, mirrorV }) => {
      const history = recordHistory();
      set((s) => {
        const layers = s.zones[zone].layers;
        const idx = layers.findIndex((l) => l.id === layerId);
        if (idx < 0) return s;
        const src = layers[idx];
        let clone: Layer = { ...src, id: newLayerId(src.type), name: src.name + ' copy' };
        if (mirrorH || mirrorV) {
          if (clone.type === 'decal' || clone.type === 'image') {
            if (mirrorH) clone = { ...clone, x: 1 - (clone as { x: number }).x } as Layer;
            if (mirrorV) clone = { ...clone, y: 1 - (clone as { y: number }).y } as Layer;
          } else if (clone.type === 'pattern') {
            let r = clone.rotation;
            if (mirrorH) r = (180 - r + 360) % 360;
            if (mirrorV) r = (360 - r) % 360;
            clone = { ...clone, rotation: r };
          }
          // Mirror the per-layer effect smear angle (any layer type)
          if (clone.effect) {
            let a = clone.effect.angle;
            if (mirrorH) a = (180 - a + 360) % 360;
            if (mirrorV) a = (360 - a) % 360;
            clone = { ...clone, effect: { ...clone.effect, angle: a } };
          }
        }
        const next = [...layers];
        next.splice(idx + 1, 0, clone);
        return {
          history,
          zones: { ...s.zones, [zone]: { ...s.zones[zone], layers: next } },
        };
      });
    },

    reorderLayer: (zone, layerId, direction) => {
      const history = recordHistory();
      set((s) => {
        const layers = [...s.zones[zone].layers];
        const idx = layers.findIndex((l) => l.id === layerId);
        if (idx < 0) return s;
        const target = idx + direction;
        if (target < 0 || target >= layers.length) return s;
        [layers[idx], layers[target]] = [layers[target], layers[idx]];
        return {
          history,
          zones: { ...s.zones, [zone]: { ...s.zones[zone], layers } },
        };
      });
    },

    setRim: (patch) => {
      const history = recordHistory();
      set((s) => ({ history, rim: { ...s.rim, ...patch } }));
    },

    // Global colour dividers (world-space cut lines). New ones default to a
    // slightly tilted line across the mid of the bike, tinting below it; the
    // handles sit on the seat tube (rear) and fork (front) so they're easy to
    // grab. The drawn line extends past them to still cut the whole bike.
    addDivider: () => {
      const history = recordHistory();
      const divider: Divider = {
        id: newLayerId('div'),
        color: '#1565c0',
        ax: -0.08,
        ay: 0.25,
        bx: 0.53,
        by: 0.28,
        softness: 0,
      };
      set((s) => ({ history, dividers: [...s.dividers, divider] }));
    },

    updateDivider: (id, patch) => {
      const history = recordHistory();
      set((s) => ({
        history,
        dividers: s.dividers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      }));
    },

    removeDivider: (id) => {
      const history = recordHistory();
      set((s) => ({ history, dividers: s.dividers.filter((d) => d.id !== id) }));
    },

    loadDesign: (state) => {
      const history = recordHistory();
      const migrated = migrateDesign(state);
      set({
        history,
        activeZone: migrated.activeZone,
        zones: migrated.zones,
        rim: migrated.rim,
        dividers: migrated.dividers,
      });
    },

    undo: () => {
      const s = get();
      if (s.history.past.length === 0) return;
      const prev = s.history.past[s.history.past.length - 1];
      const current = snapshotDesign(s);
      set({
        activeZone: prev.activeZone,
        zones: prev.zones,
        rim: prev.rim,
        dividers: prev.dividers,
        history: {
          past: s.history.past.slice(0, -1),
          future: [...s.history.future, current],
        },
      });
    },

    redo: () => {
      const s = get();
      if (s.history.future.length === 0) return;
      const next = s.history.future[s.history.future.length - 1];
      const current = snapshotDesign(s);
      set({
        activeZone: next.activeZone,
        zones: next.zones,
        rim: next.rim,
        dividers: next.dividers,
        history: {
          past: [...s.history.past, current],
          future: s.history.future.slice(0, -1),
        },
      });
    },

    canUndo: () => get().history.past.length > 0,
    canRedo: () => get().history.future.length > 0,
  };
});

export function newLayerId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
