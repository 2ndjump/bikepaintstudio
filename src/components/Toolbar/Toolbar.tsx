import { useDesignStore } from '../../state/designStore';
import type { DesignState } from '../../state/types';
import { useUIStore, type BackgroundMode, type Lang } from '../../state/uiStore';
import { useT } from '../../i18n/useT';
import { ToolSelector } from '../Viewport/ToolSelector';

export function Toolbar() {
  const state = useDesignStore();
  const t = useT();
  const lang = useUIStore((s) => s.lang);
  const setLang = useUIStore((s) => s.setLang);
  const background = useUIStore((s) => s.background);
  const setBackground = useUIStore((s) => s.setBackground);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const pastLen = useDesignStore((s) => s.history.past.length);
  const futureLen = useDesignStore((s) => s.history.future.length);

  function exportJSON() {
    const snapshot: DesignState & { palette: string[] } = {
      activeZone: state.activeZone,
      zones: state.zones,
      rim: state.rim,
      dividers: state.dividers,
      palette: useUIStore.getState().palette,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bike-design.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as DesignState & {
            palette?: string[];
          };
          useDesignStore.getState().loadDesign(data);
          if (Array.isArray(data.palette)) useUIStore.getState().setPalette(data.palette);
        } catch (e) {
          console.error('Invalid design JSON', e);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function exportPNG() {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bike-preview.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  const bgOptions: { value: BackgroundMode; labelKey: 'bgDark' | 'bgLight' }[] = [
    { value: 'dark', labelKey: 'bgDark' },
    { value: 'light', labelKey: 'bgLight' },
  ];

  const langOptions: Lang[] = ['de', 'en'];

  return (
    <header
      className="flex items-center flex-wrap gap-x-2 gap-y-2 px-3 sm:px-4 py-2 m3-panel"
      style={{ borderBottom: '1px solid var(--md-outline-variant)' }}
    >
      <h1 className="m3-title text-base mr-1">Bike Paint Studio</h1>
      <ToolSelector />
      <div className="flex-1 min-w-0" />

      <SegmentedControl>
        {bgOptions.map((opt) => (
          <SegmentButton
            key={opt.value}
            active={background === opt.value}
            onClick={() => setBackground(opt.value)}
          >
            {t(opt.labelKey)}
          </SegmentButton>
        ))}
      </SegmentedControl>

      <SegmentedControl>
        {langOptions.map((l) => (
          <SegmentButton key={l} active={lang === l} onClick={() => setLang(l)}>
            {l.toUpperCase()}
          </SegmentButton>
        ))}
      </SegmentedControl>

      <div className="m3-segmented" role="group" aria-label="history">
        <button className="m3-seg" onClick={undo} disabled={pastLen === 0} title="Ctrl+Z">
          ↶
        </button>
        <button className="m3-seg" onClick={redo} disabled={futureLen === 0} title="Ctrl+Shift+Z">
          ↷
        </button>
      </div>

      <button className="m3-btn m3-btn-tonal m3-btn-sm" onClick={exportPNG}>
        {t('pngExport')}
      </button>
      <button className="m3-btn m3-btn-tonal m3-btn-sm" onClick={exportJSON}>
        {t('save')}
      </button>
      <button className="m3-btn m3-btn-tonal m3-btn-sm" onClick={importJSON}>
        {t('load')}
      </button>
    </header>
  );
}

function SegmentedControl({ children }: { children: React.ReactNode }) {
  return (
    <div className="m3-segmented" role="group">
      {children}
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className={`m3-seg ${active ? 'm3-seg-active' : ''}`}>
      {children}
    </button>
  );
}
