import { useUIStore } from '../../state/uiStore';
import { useT } from '../../i18n/useT';

/** Hand: move & rotate the whole bike (orbit/pan). */
function HandIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 12.5V6a1.4 1.4 0 0 1 2.8 0v4.5" />
      <path d="M10.8 10.5V4.8a1.4 1.4 0 0 1 2.8 0v5.7" />
      <path d="M13.6 10.5V6.2a1.4 1.4 0 0 1 2.8 0V12" />
      <path d="M16.4 11.2v-1a1.4 1.4 0 0 1 2.8 0V15a6 6 0 0 1-6 6h-1.7a6 6 0 0 1-4.24-1.76l-3.1-3.1a1.5 1.5 0 0 1 2.12-2.12L8 15.5" />
    </svg>
  );
}

/** Four-way arrows: drag text/shape layers on the model. */
function MoveIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v18M3 12h18" />
      <path d="M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5" />
    </svg>
  );
}

/**
 * Viewport tool switch, shown in the header bar: pick between orbiting the bike
 * (hand) and dragging text/shape layers on the model (arrows). See EditControls
 * for the editing behaviour.
 */
export function ToolSelector() {
  const tool = useUIStore((s) => s.tool);
  const setTool = useUIStore((s) => s.setTool);
  const t = useT();

  return (
    <div className="m3-segmented" role="group">
      <button
        className={`m3-seg ${tool === 'camera' ? 'm3-seg-active' : ''}`}
        onClick={() => setTool('camera')}
        aria-label={t('toolCamera')}
        aria-pressed={tool === 'camera'}
      >
        <HandIcon />
      </button>
      <button
        className={`m3-seg ${tool === 'edit' ? 'm3-seg-active' : ''}`}
        onClick={() => setTool('edit')}
        aria-label={t('toolEdit')}
        aria-pressed={tool === 'edit'}
      >
        <MoveIcon />
      </button>
    </div>
  );
}
