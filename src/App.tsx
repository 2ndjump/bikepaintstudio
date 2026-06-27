import { useEffect, useState } from 'react';
import { Viewport } from './components/Viewport/Viewport';
import { ZoneSelector } from './components/Sidebar/ZoneSelector';
import { FinishPicker } from './components/Sidebar/FinishPicker';
import { LayerStack } from './components/Sidebar/LayerStack';
import { RimPanel } from './components/Sidebar/RimPanel';
import { Toolbar } from './components/Toolbar/Toolbar';
import { preloadCommonFonts } from './fonts/fontLoader';
import { useDesignStore } from './state/designStore';
import { ALL_ZONES } from './state/types';
import { useHistoryShortcuts } from './state/useHistoryShortcuts';

/** True only on small touch devices (phones). Requires BOTH a coarse primary
 *  pointer with no hover AND a small screen, so large displays (even touch
 *  ones) and narrowed desktop windows always keep the desktop side-panel. */
function useIsMobileDevice(): boolean {
  const query = '(pointer: coarse) and (hover: none) and (max-width: 820px)';
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function App() {
  const activeZone = useDesignStore((s) => s.activeZone);
  const isMobile = useIsMobileDevice();

  useHistoryShortcuts();

  useEffect(() => {
    preloadCommonFonts();
  }, []);

  // Self-heal if the selected zone no longer exists (e.g. after a zone-set
  // change), so the panel never points at a missing zone.
  useEffect(() => {
    if (!ALL_ZONES.includes(activeZone)) {
      useDesignStore.getState().setActiveZone('topTube');
    }
  }, [activeZone]);

  const isRim = activeZone === 'frontRim' || activeZone === 'rearRim';

  if (isMobile) {
    // Mobile devices: stacked, scrollable — viewport on top, controls below.
    return (
      <div className="flex flex-col h-full w-full">
        <Toolbar />
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <main className="relative w-full shrink-0 min-h-[55vh]">
            <Viewport />
          </main>
          <div className="p-3 space-y-3">
            <div className="m3-card">
              <FinishPicker />
            </div>
            <div className="m3-card">
              <ZoneSelector columns={2} />
            </div>
            {isRim && (
              <div className="m3-card">
                <RimPanel />
              </div>
            )}
            <Controls />
          </div>
        </div>
      </div>
    );
  }

  // Desktop: the control menu is always a side panel, at any window width
  // (narrowing shrinks the viewport, never drops the menu). On wide windows the
  // zone rail sits on the left and the controls on the right; when narrowed
  // below lg the rail drops out and the controls collapse to the LEFT.
  return (
    <div className="flex flex-col h-full w-full">
      <Toolbar />
      {/* CSS grid: the viewport track is minmax(0,1fr) so it can shrink to any
          size, while the panel track is fixed — the menu can never be pushed
          off-screen no matter how the 3D canvas sizes itself. The left rail is
          display:none below lg, so it drops out of the grid (2 tracks). */}
      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[12rem_minmax(0,1fr)_18rem]">
        {/* Left sidebar — only on wide windows: global frame paint + zones */}
        <aside
          className="hidden lg:flex flex-col min-h-0 overflow-y-auto p-3 gap-3 m3-panel"
          style={{ borderRight: '1px solid var(--md-outline-variant)' }}
        >
          <div className="m3-card">
            <FinishPicker />
          </div>
          <div className="m3-card">
            <ZoneSelector />
          </div>
          {isRim && (
            <div className="m3-card">
              <RimPanel />
            </div>
          )}
        </aside>

        <main className="relative min-w-0 min-h-0 overflow-hidden">
          <Viewport />
        </main>

        {/* Control menu — on the right at lg, collapses to the LEFT when narrow */}
        <aside
          className="order-first lg:order-none min-w-0 min-h-0 overflow-y-auto p-3 m3-panel border-[var(--md-outline-variant)] border-r lg:border-r-0 lg:border-l"
        >
          <div className="space-y-3">
            {/* On wide screens the paint + zones live in the left sidebar; below
                lg the left rail is hidden so they appear here instead. */}
            <div className="lg:hidden m3-card">
              <FinishPicker />
            </div>
            <div className="lg:hidden m3-card">
              <ZoneSelector columns={2} />
            </div>
            {isRim && (
              <div className="lg:hidden m3-card">
                <RimPanel />
              </div>
            )}
            <Controls />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** The per-zone layer controls (finish + base colour are global, shown
 *  separately at the top of the panel). The active zone is conveyed by the
 *  highlighted zone button, so no separate label is needed. */
function Controls() {
  return (
    <div className="m3-card">
      <LayerStack />
    </div>
  );
}
