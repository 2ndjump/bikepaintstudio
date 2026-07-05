import { useState } from 'react';
import { useDesignStore, newLayerId } from '../../state/designStore';
import type { DuplicateOptions } from '../../state/designStore';
import type { BlendMode, Layer } from '../../state/types';
import { PatternLayerEditor } from '../LayerTypes/PatternLayer';
import { ImageLayerEditor } from '../LayerTypes/ImageLayer';
import { DecalLayerEditor } from '../LayerTypes/DecalLayer';
import { ShapeLayerEditor } from '../LayerTypes/ShapeLayer';
import { EffectEditor } from '../LayerTypes/EffectEditor';
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
function ShapeIcon() {
  return (
    <svg {...ICON} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3 L13.5 12.5 H2.5 Z" />
    </svg>
  );
}

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

function DuplicatePopover({ layerId, onClose }: { layerId: string; onClose: () => void }) {
  const activeZone = useDesignStore((s) => s.activeZone);
  const duplicateLayer = useDesignStore((s) => s.duplicateLayer);
  const [opts, setOpts] = useState<DuplicateOptions>({ mirrorH: false, mirrorV: false });

  function confirm() {
    duplicateLayer(activeZone, layerId, opts);
    onClose();
  }

  return (
    <div className="m3-card-nested p-2.5 space-y-1.5">
      <div className="m3-section-title">Duplicate options</div>
      <label className="flex items-center gap-2 m3-label cursor-pointer">
        <input
          type="checkbox"
          checked={opts.mirrorH}
          onChange={(e) => setOpts((o) => ({ ...o, mirrorH: e.target.checked }))}
        />
        Mirror horizontal
      </label>
      <label className="flex items-center gap-2 m3-label cursor-pointer">
        <input
          type="checkbox"
          checked={opts.mirrorV}
          onChange={(e) => setOpts((o) => ({ ...o, mirrorV: e.target.checked }))}
        />
        Mirror vertical
      </label>
      <div className="flex gap-1.5 pt-1">
        <button onClick={confirm} className="m3-btn m3-btn-filled m3-btn-sm flex-1">
          Duplicate
        </button>
        <button onClick={onClose} className="m3-btn m3-btn-text m3-btn-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function LayerStack() {
  const activeZone = useDesignStore((s) => s.activeZone);
  const layers = useDesignStore((s) => s.zones[s.activeZone]?.layers ?? EMPTY_LAYERS);
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const addLayer = useDesignStore((s) => s.addLayer);
  const removeLayer = useDesignStore((s) => s.removeLayer);
  const reorderLayer = useDesignStore((s) => s.reorderLayer);
  const t = useT();
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addPattern() {
    const layer: Layer = {
      id: newLayerId('pattern'),
      name: 'Pattern',
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
    };
    addLayer(activeZone, layer);
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
        const layer: Layer = {
          id: newLayerId('image'),
          name: file.name,
          type: 'image',
          src: reader.result as string,
          x: 0.5,
          y: 0.5,
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
        };
        addLayer(activeZone, layer);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function addDecal() {
    const layer: Layer = {
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
      x: 0.5,
      y: 0.5,
      rotation: 0,
      glyphRotation: 0,
      visible: true,
      opacity: 1,
      blendMode: 'normal',
    };
    addLayer(activeZone, layer);
  }

  function addShape() {
    const layer: Layer = {
      id: newLayerId('shape'),
      name: t('shapeRectangle'),
      type: 'shape',
      shape: 'rectangle',
      color: '#ffffff',
      x: 0.5,
      y: 0.5,
      width: 0.4,
      height: 0.4,
      rotation: 0,
      visible: true,
      opacity: 1,
      blendMode: 'normal',
    };
    addLayer(activeZone, layer);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="m3-section-title">{t('layers')}</div>
        <button className="m3-add-btn" onClick={addPattern} title={t('addPattern').replace('+ ', '')}>
          <PatternIcon />
        </button>
        <button className="m3-add-btn" onClick={addImage} title={t('addImage').replace('+ ', '')}>
          <ImageIcon />
        </button>
        <button className="m3-add-btn" onClick={addDecal} title={t('addText').replace('+ ', '')}>
          <TextIcon />
        </button>
        <button className="m3-add-btn" onClick={addShape} title={t('addShape').replace('+ ', '')}>
          <ShapeIcon />
        </button>
      </div>

      <div className="space-y-2">
        {[...layers].reverse().map((layer) => {
          const isCollapsed = collapsed.has(layer.id);
          return (
          <div key={layer.id} className="m3-card-nested p-2.5 space-y-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleCollapsed(layer.id)}
                className="m3-icon-btn m3-icon-btn-sm"
                title={isCollapsed ? t('tooltipExpand') : t('tooltipCollapse')}
              >
                {isCollapsed ? '▸' : '▾'}
              </button>
              <input
                className={`flex-1 min-w-0 bg-transparent text-sm outline-none border-b border-transparent focus:border-[var(--md-primary)] ${
                  layer.visible ? '' : 'opacity-40 line-through'
                }`}
                value={layer.name}
                onChange={(e) =>
                  updateLayer(activeZone, layer.id, { name: e.target.value })
                }
              />

              {/* Overflow menu: show/hide, reorder, duplicate */}
              <div className="relative">
                <button
                  className="m3-icon-btn m3-icon-btn-sm"
                  onClick={() => setMenuId(menuId === layer.id ? null : layer.id)}
                  title={t('layerOptions')}
                >
                  ⋮
                </button>
                {menuId === layer.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />
                    <div className="absolute right-0 z-50 mt-1 min-w-[150px] m3-menu">
                      <button
                        className="m3-menu-item"
                        onClick={() =>
                          updateLayer(activeZone, layer.id, { visible: !layer.visible })
                        }
                      >
                        <span className="w-4 text-center">{layer.visible ? '○' : '●'}</span>
                        {layer.visible ? t('layerHide') : t('layerShow')}
                      </button>
                      <button
                        className="m3-menu-item"
                        onClick={() => reorderLayer(activeZone, layer.id, 1)}
                      >
                        <span className="w-4 text-center">▲</span>
                        {t('tooltipMoveUp')}
                      </button>
                      <button
                        className="m3-menu-item"
                        onClick={() => reorderLayer(activeZone, layer.id, -1)}
                      >
                        <span className="w-4 text-center">▼</span>
                        {t('tooltipMoveDown')}
                      </button>
                      <button
                        className="m3-menu-item"
                        onClick={() => {
                          setDuplicatingId(layer.id);
                          setMenuId(null);
                        }}
                      >
                        <span className="w-4 text-center">⧉</span>
                        {t('layerDuplicate')}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                className="m3-icon-btn m3-icon-btn-sm hover:text-[var(--md-error)]"
                onClick={() => removeLayer(activeZone, layer.id)}
                title={t('tooltipDelete')}
              >
                ✕
              </button>
            </div>

            {duplicatingId === layer.id && (
              <DuplicatePopover
                layerId={layer.id}
                onClose={() => setDuplicatingId(null)}
              />
            )}

            {!isCollapsed && (
              <>
            <div className="grid grid-cols-2 gap-2">
              <label className="m3-label flex flex-col gap-1">
                Blend
                <select
                  value={layer.blendMode}
                  onChange={(e) =>
                    updateLayer(activeZone, layer.id, {
                      blendMode: e.target.value as BlendMode,
                    })
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
              <label className="m3-label flex flex-col gap-1">
                Opacity {Math.round(layer.opacity * 100)}%
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={layer.opacity}
                  onChange={(e) =>
                    updateLayer(activeZone, layer.id, {
                      opacity: parseFloat(e.target.value),
                    })
                  }
                />
              </label>
            </div>

            {layer.type === 'pattern' && (
              <PatternLayerEditor layer={layer} zoneId={activeZone} />
            )}
            {layer.type === 'image' && (
              <ImageLayerEditor layer={layer} zoneId={activeZone} />
            )}
            {layer.type === 'decal' && (
              <DecalLayerEditor layer={layer} zoneId={activeZone} />
            )}
            {layer.type === 'shape' && (
              <ShapeLayerEditor layer={layer} zoneId={activeZone} />
            )}

            <div className="pt-1 border-t border-[var(--md-outline-variant)]">
              <EffectEditor layer={layer} zoneId={activeZone} />
            </div>
              </>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
