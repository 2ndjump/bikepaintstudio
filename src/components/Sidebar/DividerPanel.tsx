import { useDesignStore } from '../../state/designStore';
import { useT } from '../../i18n/useT';
import { ColorPicker } from '../ui/ColorPicker';

/**
 * Global colour dividers: world-space cut lines that tint everything below them
 * across all bike parts. The line itself is positioned by dragging its handles
 * on the viewport (see DividerHandles); here you add/colour/remove them.
 */
export function DividerPanel() {
  const dividers = useDesignStore((s) => s.dividers);
  const addDivider = useDesignStore((s) => s.addDivider);
  const updateDivider = useDesignStore((s) => s.updateDivider);
  const removeDivider = useDesignStore((s) => s.removeDivider);
  const t = useT();

  return (
    <div className="space-y-2">
      <div className="m3-section-title flex items-center justify-between">
        <span>{t('dividers')}</span>
        <button
          type="button"
          onClick={addDivider}
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
        {dividers.map((d, i) => (
          <div key={d.id} className="flex items-center gap-2">
            <ColorPicker
              value={d.color}
              swatchOnly
              swatchClassName="h-6 w-6"
              onChange={(c) => updateDivider(d.id, { color: c })}
            />
            <span className="flex-1 min-w-0 text-xs text-neutral-300">
              {t('dividerLabel')} {i + 1}
            </span>
            <button
              type="button"
              onClick={() => removeDivider(d.id)}
              className="m3-icon-btn m3-icon-btn-sm hover:text-[var(--md-error)]"
              title={t('tooltipDelete')}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
