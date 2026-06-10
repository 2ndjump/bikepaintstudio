import { useEffect } from 'react';
import { Viewport } from './components/Viewport/Viewport';
import { ZoneSelector } from './components/Sidebar/ZoneSelector';
import { FinishPicker } from './components/Sidebar/FinishPicker';
import { LayerStack } from './components/Sidebar/LayerStack';
import { RimPanel } from './components/Sidebar/RimPanel';
import { Toolbar } from './components/Toolbar/Toolbar';
import { preloadCommonFonts } from './fonts/fontLoader';
import { useDesignStore } from './state/designStore';
import { ZONE_LABELS } from './state/types';
import { useT } from './i18n/useT';
import { useHistoryShortcuts } from './state/useHistoryShortcuts';

export default function App() {
  const activeZone = useDesignStore((s) => s.activeZone);
  const t = useT();

  useHistoryShortcuts();

  useEffect(() => {
    preloadCommonFonts();
  }, []);

  const isRim = activeZone === 'frontRim' || activeZone === 'rearRim';

  return (
    <div className="flex flex-col h-full">
      <Toolbar />
      <div className="flex-1 flex min-h-0">
        <aside className="w-64 bg-neutral-950 border-r border-neutral-800 p-3 overflow-y-auto">
          <ZoneSelector />
          {isRim && (
            <div className="mt-4">
              <RimPanel />
            </div>
          )}
        </aside>

        <main className="flex-1 relative min-w-0">
          <Viewport />
        </main>

        <aside className="w-80 bg-neutral-950 border-l border-neutral-800 p-3 overflow-y-auto">
          <div className="mb-3">
            <div className="text-xs uppercase tracking-wider text-neutral-400">
              {t('active')}
            </div>
            <div className="text-sm font-medium">{ZONE_LABELS[activeZone]}</div>
          </div>
          <div className="mb-4">
            <FinishPicker />
          </div>
          <LayerStack />
        </aside>
      </div>
    </div>
  );
}
