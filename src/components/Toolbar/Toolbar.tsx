import { useDesignStore } from '../../state/designStore';
import type { DesignState } from '../../state/types';
import { useUIStore, type BackgroundMode, type Lang } from '../../state/uiStore';
import { useT } from '../../i18n/useT';
import { designToXML, xmlToDesign } from '../../state/xmlFormat';

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
    const snapshot: DesignState = {
      activeZone: state.activeZone,
      zones: state.zones,
      rim: state.rim,
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
          const data = JSON.parse(reader.result as string) as DesignState;
          useDesignStore.getState().loadDesign(data);
        } catch (e) {
          console.error('Invalid design JSON', e);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function exportXML() {
    const snapshot: DesignState = {
      activeZone: state.activeZone,
      zones: state.zones,
      rim: state.rim,
    };
    const blob = new Blob([designToXML(snapshot)], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bike-design.xml';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importXML() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/xml,.xml';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = xmlToDesign(reader.result as string);
          useDesignStore.getState().loadDesign(data);
        } catch (e) {
          console.error('Invalid design XML', e);
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

  const bgOptions: { value: BackgroundMode; labelKey: 'bgDark' | 'bgLight' | 'bgStudio' }[] = [
    { value: 'dark', labelKey: 'bgDark' },
    { value: 'light', labelKey: 'bgLight' },
    { value: 'studio', labelKey: 'bgStudio' },
  ];

  const langOptions: Lang[] = ['de', 'en'];

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-neutral-950 border-b border-neutral-800">
      <h1 className="text-sm font-semibold tracking-wide text-neutral-100">
        Bike Paint Studio
      </h1>
      <div className="flex-1" />

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
          <SegmentButton
            key={l}
            active={lang === l}
            onClick={() => setLang(l)}
          >
            {l.toUpperCase()}
          </SegmentButton>
        ))}
      </SegmentedControl>

      <button
        className="btn-mini disabled:opacity-40"
        onClick={undo}
        disabled={pastLen === 0}
        title="Ctrl+Z"
      >
        ↶ {t('undo')}
      </button>
      <button
        className="btn-mini disabled:opacity-40"
        onClick={redo}
        disabled={futureLen === 0}
        title="Ctrl+Shift+Z"
      >
        ↷ {t('redo')}
      </button>

      <button className="btn-mini" onClick={exportPNG}>
        {t('pngExport')}
      </button>
      <button className="btn-mini" onClick={exportJSON}>
        {t('save')}
      </button>
      <button className="btn-mini" onClick={importJSON}>
        {t('load')}
      </button>
      <button className="btn-mini" onClick={exportXML} title="Export as human-readable XML">
        XML ↓
      </button>
      <button className="btn-mini" onClick={importXML} title="Import from XML">
        XML ↑
      </button>
    </div>
  );
}

function SegmentedControl({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex rounded border border-neutral-700 overflow-hidden">
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
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs transition ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
      }`}
    >
      {children}
    </button>
  );
}
