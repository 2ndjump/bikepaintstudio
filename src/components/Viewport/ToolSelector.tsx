import { useUIStore } from '../../state/uiStore';
import { useT } from '../../i18n/useT';

/** Orbit tool: circular arrows (move & rotate the bike). */
function OrbitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v4h-4" />
    </svg>
  );
}

/** Edit tool: four-way move arrows (drag text/shape layers). */
function MoveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v18M3 12h18" />
      <path d="M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5" />
    </svg>
  );
}

/**
 * Viewport tool switch (overlaid top-left): pick between orbiting the bike and
 * dragging text/shape layers on the model. See EditControls for the editing
 * behaviour.
 */
export function ToolSelector() {
  const tool = useUIStore((s) => s.tool);
  const setTool = useUIStore((s) => s.setTool);
  const t = useT();

  const btn = (value: 'camera' | 'edit', label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTool(value)}
      title={label}
      aria-label={label}
      aria-pressed={tool === value}
      className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
        tool === value
          ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
          : 'text-neutral-300 hover:bg-[var(--md-surface-container-high)]'
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
      <div className="flex flex-col gap-1 rounded-lg p-1 m3-panel shadow-md">
        {btn('camera', t('toolCamera'), <OrbitIcon />)}
        {btn('edit', t('toolEdit'), <MoveIcon />)}
      </div>
      {tool === 'edit' && (
        <div className="max-w-[9rem] rounded-md px-2 py-1 text-[10px] leading-tight m3-panel text-neutral-300 shadow-md">
          {t('toolEditHint')}
        </div>
      )}
    </div>
  );
}
