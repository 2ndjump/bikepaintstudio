import { useEffect, useState } from 'react';
import { Viewport } from './components/Viewport/Viewport';
import { ZoneSelector } from './components/Sidebar/ZoneSelector';
import { PalettePanel } from './components/Sidebar/PalettePanel';
import { DividerPanel } from './components/Sidebar/DividerPanel';
import { FinishPicker } from './components/Sidebar/FinishPicker';
import { LayerStack } from './components/Sidebar/LayerStack';
import { RimPanel } from './components/Sidebar/RimPanel';
import { VariantPicker } from './components/Sidebar/VariantPicker';
import { WheelPanel } from './components/Sidebar/WheelPanel';
import { WheelSpinControls } from './components/Viewport/WheelSpinControls';
import { Toolbar } from './components/Toolbar/Toolbar';
import { preloadCommonFonts } from './fonts/fontLoader';
import { useDesignStore } from './state/designStore';
import { ALL_ZONES, isRimZone } from './state/types';
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

  const isRim = isRimZone(activeZone);

  // Frame mode: model, frame paint, zones, dividers. Wheel mode: which wheel,
  // its paint (independent of the frame) and the rim geometry.
  const paintSections = isRim ? (
    <>
      <section className="m3-section">
        <WheelPanel />
      </section>
      <section className="m3-section space-y-3">
        <FinishPicker zone={activeZone} />
        <PalettePanel />
      </section>
      <section className="m3-section">
        <RimPanel />
      </section>
    </>
  ) : (
    <>
      <section className="m3-section">
        <VariantPicker />
      </section>
      <section className="m3-section space-y-3">
        <FinishPicker />
        <PalettePanel />
      </section>
      <section className="m3-section">
        <ZoneSelector columns={2} />
      </section>
      <section className="m3-section">
        <DividerPanel />
      </section>
    </>
  );

  if (isMobile) {
    // Mobile devices: stacked, scrollable — viewport on top, controls below.
    return (
      <div className="flex flex-col h-full w-full">
        <Toolbar />
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <main className="relative w-full shrink-0 min-h-[55vh]">
            <Viewport />
          </main>
          <div className="glass m-3 p-3">
            {paintSections}
            <section className="m3-section">
              <LayerStack />
            </section>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: the studio fills the window and the controls float over it as
  // frosted-glass panels (the viewport keeps the bike centred in the free area
  // between them, see ViewFit). Wide windows: paint + zones on the left,
  // layers on the right; below lg everything collapses into the left panel.
  return (
    <div className="relative h-full w-full overflow-hidden">
      <main className="absolute inset-0">
        <Viewport />
      </main>

      <Toolbar floating />

      {isRim && <WheelSpinControls />}

      <aside data-overlay="left" className="glass glass-panel left-[var(--glass-gap)]">
        {paintSections}
        <section className="m3-section lg:hidden">
          <LayerStack />
        </section>
      </aside>

      <aside data-overlay="right" className="glass glass-panel right-[var(--glass-gap)] hidden lg:block">
        <section className="m3-section">
          <LayerStack />
        </section>
      </aside>
    </div>
  );
}
