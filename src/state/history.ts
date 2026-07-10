import type { DesignState } from './types';

const MAX_HISTORY = 50;

export interface HistoryState {
  past: DesignState[];
  future: DesignState[];
}

export function makeEmptyHistory(): HistoryState {
  return { past: [], future: [] };
}

export function pushHistory(
  history: HistoryState,
  snapshot: DesignState,
): HistoryState {
  const past = [...history.past, snapshot];
  if (past.length > MAX_HISTORY) past.shift();
  return { past, future: [] };
}

export function snapshotDesign(state: DesignState): DesignState {
  return {
    activeZone: state.activeZone,
    zones: structuredClone(state.zones),
    rim: { ...state.rim },
    dividers: structuredClone(state.dividers),
  };
}
