import { Fragment } from 'react';
import { useDesignStore, newLayerId } from '../../state/designStore';
import { ZONE_LABELS, isRimZone, type BlendMode, type FinishType, type Layer } from '../../state/types';
import { useUIStore } from '../../state/uiStore';
import { visibleSpot } from '../Viewport/viewportBridge';
import { Slider } from '../ui/Slider';
import type { I18nKey } from '../../i18n/strings';
import { PatternLayerEditor } from '../LayerTypes/PatternLayer';
import { ImageLayerEditor } from '../LayerTypes/ImageLayer';
import { DecalLayerEditor } from '../LayerTypes/DecalLayer';
import { ShapeLayerEditor } from '../LayerTypes/ShapeLayer';
import { EffectEditor } from '../LayerTypes/EffectEditor';
import { FillEditor } from '../LayerTypes/FillEditor';
import { FINISHES } from './finishes';
import { useT } from '../../i18n/useT';

const EMPTY_LAYERS: Layer[] = [];

const ICON = { width: 15, height: 15, viewBox: '0 0 16 16' } as const;

/** Pattern: a 2×2 grid of tiles. */
function PatternIcon() {
  return (
    <svg {...ICON} fill="currentColor" aria-hidden="true">
      <rect x="2" y="2" width="4.5" height="4.5" rx="0.8" />
      <rect x="9.5" y="2" width="4.5" height="4.5" rx="0.8" />
      <rect x="2" y="9.5" width="4.5" height="4.5" rx="0.8" />
      <rect x="9.5" y="9.5" width="4.5" height="4.5" rx="0.8" />
    </svg>
  );
}

/** Image: framed picture with sun + mountain. */
function ImageIcon() {
  return (
    <svg {...ICON} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.6" />
      <circle cx="5.5" cy="6.3" r="1.1" fill="currentColor" stroke="none" />
      <path d="M3 12 L6.5 8.2 L9 10.6 L11 8.8 L13 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Text: a capital T. */
function TextIcon() {
  return (
    <svg {...ICON} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4 H12" />
      <path d="M8 4 V12.5" />
    </svg>
  );
}

/** Shape: a triangle. */
export function ShapeIcon() {
  return (
    <svg {...ICON} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3 L13.5 12.5 H2.5 Z" />
    </svg>
  );
}

/** Chain link — groups a layer with the one below. */
function LinkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/** Small stroke icons for the layer row actions. */
function RowIcon({ d }: { d: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const EYE = 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z';
const EYE_OFF =
  'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2';
const UP = 'M12 19V5M5 12l7-7 7 7';
const DOWN = 'M12 5v14M19 12l-7 7-7-7';
const COPY = 'M9 9h11v11H9zM5 15H4V4h11v1';
const TRASH = 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3';

const TYPE_ICON: Record<Layer['type'], () => React.ReactElement> = {
  pattern: PatternIcon,
  image: ImageIcon,
  decal: TextIcon,
  shape: ShapeIcon,
  solid: PatternIcon,
};

/** The layer's type icon on its colour, or a thumbnail of its image. */
function LayerChip({ layer, icon: Icon }: { layer: Layer; icon: () => React.ReactElement }) {
  if (layer.type === 'image') {
    return (
      <span className="layer-chip">
        <img src={layer.src} alt="" />
      </span>
    );
  }
  // Dark or light icon, whichever reads on the colour (rough sRGB luma).
  const n = parseInt(layer.color.slice(1, 7), 16);
  const luma = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return (
    <span className="layer-chip" style={{ background: layer.color, color: luma > 150 ? '#14171c' : '#fff' }}>
      <Icon />
    </span>
  );
}

/** Rim repeat choices: once, or evenly on the half, third, quarter, fifth. */
const REPEATS = [
  { n: 1, label: '1' },
  { n: 2, label: '½' },
  { n: 3, label: '⅓' },
  { n: 4, label: '¼' },
  { n: 5, label: '⅕' },
];

const BLEND_MODES: BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'softLight',
  'hardLight',
  'colorDodge',
  'colorBurn',
];

/**
 * The active zone's layer stack (top layer first). Each row has visibility,
 * reorder, duplicate and delete at hand; clicking a row (or the layer on the
 * model) selects it, which expands its full editor below the row and shows
 * move/scale/rotate handles on the model. New layers are placed on the side of
 * the part facing the camera and selected right away.
 */
export function LayerStack() {
  const activeZone = useDesignStore((s) => s.activeZone);
  const layers = useDesignStore((s) => s.zones[s.activeZone]?.layers ?? EMPTY_LAYERS);
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const addLayer = useDesignStore((s) => s.addLayer);
  const removeLayer = useDesignStore((s) => s.removeLayer);
  const reorderLayer = useDesignStore((s) => s.reorderLayer);
  const duplicateLayer = useDesignStore((s) => s.duplicateLayer);
  const hasDividers = useDesignStore((s) => s.dividers.length > 0);
  const selectedId = useUIStore((s) => s.selectedLayerId);
  const select = useUIStore((s) => s.setSelectedLayerId);
  const t = useT();

  function addAndSelect(layer: Layer) {
    addLayer(activeZone, layer);
    select(layer.id);
    useUIStore.getState().setActiveDividerId(null);
  }

  function duplicate(layerId: string) {
    const before = new Set(useDesignStore.getState().zones[activeZone].layers.map((l) => l.id));
    duplicateLayer(activeZone, layerId);
    const clone = useDesignStore.getState().zones[activeZone].layers.find((l) => !before.has(l.id));
    if (clone) select(clone.id);
  }

  function addPattern() {
    addAndSelect({
      id: newLayerId('pattern'),
      name: t('pattern'),
      type: 'pattern',
      pattern: 'hexagons',
      color: '#ffffff',
      scale: 10,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      rotationX: 0,
      rotationY: 0,
      intensity: 1,
      visible: true,
      opacity: 1,
      blendMode: 'normal',
    });
  }

  function addImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const { x, y } = visibleSpot(activeZone);
        addAndSelect({
          id: newLayerId('image'),
          name: file.name,
          type: 'image',
          src: reader.result as string,
          x,
          y,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          brightness: 0,
          contrast: 0,
          saturation: 0,
          hueShift: 0,
          dodge: 0,
          burn: 0,
          levelsBlack: 0,
          levelsGamma: 1,
          levelsWhite: 1,
          visible: true,
          opacity: 1,
          blendMode: 'normal',
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function addDecal() {
    const { x, y } = visibleSpot(activeZone);
    addAndSelect({
      id: newLayerId('decal'),
      name: 'Text',
      type: 'decal',
      text: 'SAMPLE',
      font: 'Oswald',
      size: 64,
      color: '#ffffff',
      outlineColor: '#000000',
      outlineWidth: 0,
      letterSpacing: 0,
      x,
      y,
      rotation: 0,
      glyphRotation: 0,
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      visible: true,
      opacity: 1,
      blendMode: 'normal',
    });
  }

  function addShape() {
    const { x, y } = visibleSpot(activeZone);
    addAndSelect({
      id: newLayerId('shape'),
      name: t('shapeRectangle'),
      type: 'shape',
      shape: 'rectangle',
      color: '#ffffff',
      x,
      y,
      width: 0.4,
      height: 0.4,
      rotation: 0,
      visible: true,
      opacity: 1,
      blendMode: 'normal',
    });
  }

  const ADD: { key: I18nKey; icon: () => React.ReactElement; run: () => void }[] = [
    { key: 'text', icon: TextIcon, run: addDecal },
    { key: 'shape', icon: ShapeIcon, run: addShape },
    { key: 'image', icon: ImageIcon, run: addImage },
    { key: 'pattern', icon: PatternIcon, run: addPattern },
  ];

  const zoneName = isRimZone(activeZone)
    ? t(activeZone === 'frontRim' ? 'wheelFront' : 'wheelRear')
    : ZONE_LABELS[activeZone];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="m3-section-title">{t('layers')}</div>
        <div className="m3-label truncate">{zoneName}</div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {ADD.map(({ key, icon: Icon, run }) => (
          <button key={key} type="button" onClick={run} className="layer-add-btn" title={`+ ${t(key)}`}>
            <Icon />
            <span>{t(key)}</span>
          </button>
        ))}
      </div>

      <div>
        {[...layers].reverse().map((layer, ri, rev) => {
          // A layer can group with the one below it unless it's the bottom layer.
          const hasBelow = ri < rev.length - 1;
          const inGroup = (!!layer.group && hasBelow) || (ri > 0 && !!rev[ri - 1].group);
          const placeable = layer.type !== 'pattern' && layer.type !== 'solid';
          const selected = layer.id === selectedId;
          const Icon = TYPE_ICON[layer.type];
          const idx = layers.length - 1 - ri;
          return (
            <Fragment key={layer.id}>
              <div
                className={`list-row layer-row ${selected ? 'list-row-selected' : ''} ${
                  inGroup ? 'list-row-rail' : ''
                }`}
              >
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => select(selected ? null : layer.id)}
                    aria-expanded={selected}
                    title={layer.type !== 'pattern' ? t('layerEditHint') : undefined}
                    className={`flex-1 min-w-0 flex items-center gap-2.5 text-left text-sm py-2 ${
                      selected ? 'font-medium' : ''
                    } ${layer.visible ? '' : 'opacity-45'}`}
                  >
                    <LayerChip layer={layer} icon={Icon} />
                    <span className="truncate">{layer.name}</span>
                  </button>
                  <button
                    type="button"
                    className="m3-icon-btn m3-icon-btn-sm"
                    onClick={() => updateLayer(activeZone, layer.id, { visible: !layer.visible })}
                    title={layer.visible ? t('layerHide') : t('layerShow')}
                    aria-pressed={!layer.visible}
                  >
                    <RowIcon d={layer.visible ? EYE : EYE_OFF} />
                  </button>
                  <button
                    type="button"
                    className="m3-icon-btn m3-icon-btn-sm"
                    onClick={() => reorderLayer(activeZone, layer.id, 1)}
                    disabled={idx === layers.length - 1}
                    title={t('tooltipMoveUp')}
                  >
                    <RowIcon d={UP} />
                  </button>
                  <button
                    type="button"
                    className="m3-icon-btn m3-icon-btn-sm"
                    onClick={() => reorderLayer(activeZone, layer.id, -1)}
                    disabled={idx === 0}
                    title={t('tooltipMoveDown')}
                  >
                    <RowIcon d={DOWN} />
                  </button>
                  <button
                    type="button"
                    className="m3-icon-btn m3-icon-btn-sm"
                    onClick={() => duplicate(layer.id)}
                    title={t('layerDuplicate')}
                  >
                    <RowIcon d={COPY} />
                  </button>
                  <button
                    type="button"
                    className="m3-icon-btn m3-icon-btn-sm hover:text-[var(--md-error)]"
                    onClick={() => {
                      removeLayer(activeZone, layer.id);
                      if (selected) select(null);
                    }}
                    title={t('tooltipDelete')}
                  >
                    <RowIcon d={TRASH} />
                  </button>
                </div>

                {selected && (
                  <div className="space-y-3 px-1 pt-2 pb-1">
                    <label className="m3-label flex flex-col gap-1">
                      {t('layerName')}
                      <input
                        className="m3-field"
                        value={layer.name}
                        onChange={(e) => updateLayer(activeZone, layer.id, { name: e.target.value })}
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 items-end">
                      <label className="m3-label flex flex-col gap-1">
                        {t('blend')}
                        <select
                          value={layer.blendMode}
                          onChange={(e) =>
                            updateLayer(activeZone, layer.id, { blendMode: e.target.value as BlendMode })
                          }
                          className="m3-field"
                        >
                          {BLEND_MODES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Slider
                        label={t('opacity')}
                        unit="%"
                        scale={100}
                        min={0}
                        max={1}
                        step={0.01}
                        value={layer.opacity}
                        onChange={(v) => updateLayer(activeZone, layer.id, { opacity: v })}
                      />
                    </div>

                    <label className="m3-label flex flex-col gap-1">
                      {t('layerFinish')}
                      <select
                        value={layer.finish ?? ''}
                        onChange={(e) =>
                          updateLayer(activeZone, layer.id, {
                            finish: (e.target.value || undefined) as FinishType | undefined,
                          })
                        }
                        className="m3-field"
                      >
                        <option value="">{t('finishInherit')}</option>
                        {FINISHES.map((f) => (
                          <option key={f.value} value={f.value}>
                            {t(f.labelKey)}
                          </option>
                        ))}
                      </select>
                    </label>

                    {isRimZone(activeZone) && placeable && (
                      <div className="space-y-1">
                        <div className="m3-label">{t('layerRepeat')}</div>
                        <div className="m3-segmented w-full" role="group">
                          {REPEATS.map(({ n, label }) => (
                            <button
                              key={n}
                              type="button"
                              className={`m3-seg flex-1 ${(layer.repeat ?? 1) === n ? 'm3-seg-active' : ''}`}
                              title={n === 1 ? t('repeatOnce') : `${t('layerRepeat')}: ${n}×`}
                              onClick={() => updateLayer(activeZone, layer.id, { repeat: n === 1 ? undefined : n })}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {layer.type === 'pattern' && <PatternLayerEditor layer={layer} zoneId={activeZone} />}
                    {layer.type === 'image' && <ImageLayerEditor layer={layer} zoneId={activeZone} />}
                    {layer.type === 'decal' && <DecalLayerEditor layer={layer} zoneId={activeZone} />}
                    {layer.type === 'shape' && <ShapeLayerEditor layer={layer} zoneId={activeZone} />}

                    {placeable && (
                      <div className="pt-2 border-t border-[var(--md-outline-variant)] space-y-2">
                        <div className="m3-label">{t('layerFill')}</div>
                        <FillEditor layer={layer} zoneId={activeZone} />
                      </div>
                    )}

                    <div className="pt-2 border-t border-[var(--md-outline-variant)]">
                      <EffectEditor layer={layer} zoneId={activeZone} />
                    </div>

                    {hasDividers && (
                      <div className="pt-2 border-t border-[var(--md-outline-variant)]">
                        <label className="flex items-center gap-2 m3-label cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!layer.belowDivider}
                            onChange={(e) => updateLayer(activeZone, layer.id, { belowDivider: e.target.checked })}
                          />
                          {t('layerBelowDivider')}
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Link connector to the layer below: groups the two (moved,
                  scaled and rotated together). Accent when linked; grouped rows
                  get an accent rail (inGroup). */}
              {hasBelow && (
                <div className="relative flex justify-center -my-1.5">
                  <button
                    type="button"
                    onClick={() => updateLayer(activeZone, layer.id, { group: !layer.group })}
                    title={t('layerGroup')}
                    aria-pressed={!!layer.group}
                    className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border transition ${
                      layer.group
                        ? 'border-[var(--md-primary)] text-[var(--md-primary)] bg-[var(--md-primary-container)]'
                        : 'border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] bg-[var(--md-surface-container-high)] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <LinkIcon />
                  </button>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
