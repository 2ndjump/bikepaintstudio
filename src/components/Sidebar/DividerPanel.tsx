import { useDesignStore } from '../../state/designStore';
import { useUIStore } from '../../state/uiStore';
import { useT } from '../../i18n/useT';
import { ColorPicker } from '../ui/ColorPicker';

/**
 * Global colour dividers: world-space cut lines that tint everything below them
 * across the frame. Click a divider to edit it — only then does its guide line +
 * handles appear on the viewport (drag the handles to position the line).
 */
export function DividerPanel() {
  const dividers = useDesignStore((s) => s.dividers);
  const addDivider = useDesignStore((s) => s.addDivider);
  const updateDivider = useDesignStore((s) => s.updateDivider);
  const removeDivider = useDesignStore((s) => s.removeDivider);
  const activeId = useUIStore((s) => s.activeDividerId);
  const setActiveId = useUIStore((s) => s.setActiveDividerId);
  const t = useT();

  function add() {
    addDivider();
    const ds = useDesignStore.getState().dividers;
    const last = ds[ds.length - 1];
    if (last) setActiveId(last.id); // select the new one so its handles show
  }

  return (
    <div className="space-y-2">
      <div className="m3-section-title flex items-center justify-between">
        <span>{t('dividers')}</span>
        <button
          type="button"
          onClick={add}
          className="m3-icon-btn m3-icon-btn-sm"
          title={t('addDivider')}
          aria-label={t('addDivider')}
        >
          +
        </button>
      </div>

      {dividers.length === 0 && (
        <div className="text-xs text-neutral-500">{t('dividersEmpty')}</div>
      )}

      <div className="space-y-1.5">
        {dividers.map((d, i) => {
          const active = d.id === activeId;
          return (
            <div
              key={d.id}
              className={`rounded-md px-1 py-0.5 ${active ? 'ring-1 ring-[var(--md-primary)]' : ''}`}
            >
              <div className="flex items-center gap-2">
                <ColorPicker
                  value={d.color}
                  swatchOnly
                  swatchClassName="h-6 w-6"
                  onChange={(c) => updateDivider(d.id, { color: c })}
                />
                <button
                  type="button"
                  onClick={() => setActiveId(active ? null : d.id)}
                  title={t('dividerEdit')}
                  className={`flex-1 min-w-0 text-left text-xs truncate bg-transparent ${
                    active ? 'text-[var(--md-primary)]' : 'text-neutral-300'
                  }`}
                >
                  {t('dividerLabel')} {i + 1}
                  {active && <span className="text-neutral-500"> · {t('dividerEditing')}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeDivider(d.id);
                    if (active) setActiveId(null);
                  }}
                  className="m3-icon-btn m3-icon-btn-sm hover:text-[var(--md-error)]"
                  title={t('tooltipDelete')}
                >
                  ✕
                </button>
              </div>

              {active && (
                <label className="mt-1 flex flex-col gap-1 px-1 pb-1 text-xs text-neutral-400">
                  {t('dividerSoftness')} {Math.round((d.softness ?? 0) * 100)}%
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={d.softness ?? 0}
                    onChange={(e) =>
                      updateDivider(d.id, { softness: parseFloat(e.target.value) })
                    }
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
