import { useDesignStore } from '../../state/designStore';
import { useUIStore } from '../../state/uiStore';
import { useT } from '../../i18n/useT';
import { ColorPicker } from '../ui/ColorPicker';
import { Slider } from '../ui/Slider';
import { PatternPicker } from '../ui/PatternPicker';
import { ShapeKindSelect } from '../LayerTypes/ShapeLayer';
import { ShapeIcon } from './LayerStack';
import { DIV_MAX } from '../../rendering/dividers';

/**
 * Global colour dividers: world-space cut lines that tint everything below them
 * across the frame, and global shapes that tint everything inside them (side
 * profile). Click an entry to edit it — only then do its guide + handles appear
 * on the viewport (drag the handles to position it).
 */
export function DividerPanel() {
  const dividers = useDesignStore((s) => s.dividers);
  const addDivider = useDesignStore((s) => s.addDivider);
  const addDividerShape = useDesignStore((s) => s.addDividerShape);
  const updateDivider = useDesignStore((s) => s.updateDivider);
  const reorderDivider = useDesignStore((s) => s.reorderDivider);
  const removeDivider = useDesignStore((s) => s.removeDivider);
  const activeId = useUIStore((s) => s.activeDividerId);
  const setActiveId = useUIStore((s) => s.setActiveDividerId);
  const t = useT();

  // The shader has room for DIV_MAX entries (lines + shapes together).
  const full = dividers.length >= DIV_MAX;

  function add(kind: 'line' | 'shape') {
    if (kind === 'shape') addDividerShape();
    else addDivider();
    const ds = useDesignStore.getState().dividers;
    const last = ds[ds.length - 1];
    if (last) setActiveId(last.id); // select the new one so its handles show
  }

  return (
    <div className="space-y-2">
      <div className="m3-section-title flex items-center justify-between">
        <span>{t('dividers')}</span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => add('shape')}
            disabled={full}
            className="m3-icon-btn m3-icon-btn-sm disabled:opacity-30"
            title={t('addDividerShape')}
            aria-label={t('addDividerShape')}
          >
            <ShapeIcon />
          </button>
          <button
            type="button"
            onClick={() => add('line')}
            disabled={full}
            className="m3-icon-btn m3-icon-btn-sm disabled:opacity-30"
            title={t('addDivider')}
            aria-label={t('addDivider')}
          >
            +
          </button>
        </span>
      </div>

      {dividers.length === 0 && (
        <div className="m3-label">{t('dividersEmpty')}</div>
      )}

      <div className="space-y-1.5">
        {dividers.map((d, i) => {
          const active = d.id === activeId;
          const isShape = d.kind === 'shape';
          return (
            <div
              key={d.id}
              className={`list-row px-1.5 py-1 ${active ? 'list-row-selected' : ''}`}
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
                  title={t(active ? 'dividerEditing' : 'dividerEdit')}
                  className={`flex-1 min-w-0 text-left text-xs truncate bg-transparent ${
                    active ? 'text-[var(--md-primary)] font-medium' : 'text-[var(--md-on-surface)]'
                  }`}
                >
                  {t(isShape ? 'dividerShapeLabel' : 'dividerLabel')} {i + 1}
                </button>
                <button
                  type="button"
                  onClick={() => reorderDivider(d.id, -1)}
                  disabled={i === 0}
                  className="m3-icon-btn m3-icon-btn-sm disabled:opacity-30"
                  title={t('tooltipMoveUp')}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => reorderDivider(d.id, 1)}
                  disabled={i === dividers.length - 1}
                  className="m3-icon-btn m3-icon-btn-sm disabled:opacity-30"
                  title={t('tooltipMoveDown')}
                >
                  ▼
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
                <div className="mt-1 space-y-1.5 px-1 pb-1">
                  {isShape ? (
                    <>
                      <ShapeKindSelect
                        value={d.shape ?? 'star'}
                        onChange={(shape) => updateDivider(d.id, { shape })}
                      />
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        {(['w', 'h'] as const).map((k) => (
                          <Slider
                            key={k}
                            label={t(k === 'w' ? 'width' : 'height')}
                            unit="cm"
                            scale={100}
                            min={0.02}
                            max={k === 'w' ? 2 : 0.8} // width spans past the whole bike (~1.8 m)
                            step={0.005}
                            value={d[k] ?? 0.1}
                            onChange={(v) => updateDivider(d.id, { [k]: v })}
                          />
                        ))}
                      </div>
                      <Slider
                        label={t('rotation')}
                        unit="°"
                        min={0}
                        max={360}
                        step={1}
                        value={d.rotation ?? 0}
                        onChange={(v) => updateDivider(d.id, { rotation: v })}
                      />
                    </>
                  ) : (
                    <Slider
                      label={t('dividerSoftness')}
                      unit="%"
                      scale={100}
                      min={0}
                      max={1}
                      step={0.01}
                      value={d.softness ?? 0}
                      onChange={(v) => updateDivider(d.id, { softness: v })}
                    />
                  )}

                  <PatternPicker
                    value={d.pattern}
                    onChange={(pattern) => updateDivider(d.id, { pattern })}
                    color={d.patternColor ?? '#0a0a0a'}
                    background={d.color}
                    noneLabel={t('dividerPatternNone')}
                  />

                  {d.pattern && (
                    <>
                      <ColorPicker
                        value={d.patternColor ?? '#0a0a0a'}
                        label={t('color')}
                        onChange={(c) => updateDivider(d.id, { patternColor: c })}
                      />
                      <Slider
                        label={t('scale')}
                        min={1}
                        max={60}
                        step={1}
                        value={d.patternScale ?? 12}
                        onChange={(v) => updateDivider(d.id, { patternScale: v })}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
