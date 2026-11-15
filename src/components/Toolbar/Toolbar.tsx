import { loadDesignFile, useDesignStore, type DesignFile } from '../../state/designStore';
import type { DesignState } from '../../state/types';
import { useUIStore, type Lang } from '../../state/uiStore';
import { useT } from '../../i18n/useT';
import { ModeTabs } from './ModeTabs';
import { TemplateGalleryToggle } from './TemplateGallery';

/** Minimal shape of the File System Access API's save picker (not in lib.dom). */
type ShowSaveFilePicker = (opts: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<{
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
}>;

/** `floating`: the desktop glass bar over the full-window studio. */
export function Toolbar({ floating = false }: { floating?: boolean }) {
  const state = useDesignStore();
  const t = useT();
  const lang = useUIStore((s) => s.lang);
  const setLang = useUIStore((s) => s.setLang);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const pastLen = useDesignStore((s) => s.history.past.length);
  const futureLen = useDesignStore((s) => s.history.future.length);

  async function exportJSON() {
    const snapshot: DesignState & { palette: string[] } = {
      activeZone: state.activeZone,
      zones: state.zones,
      rim: state.rim,
      dividers: state.dividers,
      variant: state.variant,
      palette: useUIStore.getState().palette,
    };
    const json = JSON.stringify(snapshot, null, 2);
    const suggestedName = 'bike-design.json';

    // Preferred: the native save dialog lets the user set the name + location.
    const picker = (window as unknown as { showSaveFilePicker?: ShowSaveFilePicker })
      .showSaveFilePicker;
    if (picker) {
      try {
        const handle = await picker({
          suggestedName,
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return; // user cancelled
        // otherwise fall through to the download fallback below
      }
    }

    // Fallback (browsers without the File System Access API): prompt for a name.
    const name = window.prompt(t('save'), suggestedName);
    if (name === null) return; // cancelled
    const filename = name.trim() ? (name.endsWith('.json') ? name : `${name}.json`) : suggestedName;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
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
          loadDesignFile(JSON.parse(reader.result as string) as DesignFile);
        } catch (e) {
          console.error('Invalid design JSON', e);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async function exportPNG() {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return;
    // Hide on-canvas guides (divider lines, hover/selection tints) for a
    // couple of frames so the image shows only the bike.
    const ui = useUIStore.getState();
    ui.setCapturing(true);
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    await frame();
    await frame();
    canvas.toBlob((blob) => {
      useUIStore.getState().setCapturing(false);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bike-preview.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  const langOptions: Lang[] = ['de', 'en'];

  return (
    <header
      data-overlay="top"
      className={`glass toolbar flex items-center gap-2 px-3 ${floating ? 'toolbar-floating' : ''}`}
    >
      {/* Left and right clusters share the free width equally, so undo/redo
          sits in the middle whenever there is room (never overlapping). */}
      <div className="flex-1 flex items-center gap-2 min-w-max">
        <img
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          alt="Bike Paint Studio"
          title="Bike Paint Studio"
          width={28}
          height={28}
          className="mr-1 shrink-0"
        />
        <ModeTabs />
      </div>

      <div className="history-group" role="group" aria-label="history">
        <button className="history-btn" onClick={undo} disabled={pastLen === 0} title={t('undo')} aria-label={t('undo')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
        <button className="history-btn" onClick={redo} disabled={futureLen === 0} title={t('redo')} aria-label={t('redo')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2 min-w-max">
        <SegmentedControl>
          {langOptions.map((l) => (
            <SegmentButton key={l} active={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </SegmentButton>
          ))}
        </SegmentedControl>

        <TemplateGalleryToggle />
        <button className="m3-btn m3-btn-tonal m3-btn-sm" onClick={exportPNG}>
          {t('pngExport')}
        </button>
        <button className="m3-btn m3-btn-tonal m3-btn-sm" onClick={exportJSON}>
          {t('save')}
        </button>
        <button className="m3-btn m3-btn-tonal m3-btn-sm" onClick={importJSON}>
          {t('load')}
        </button>
      </div>
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
