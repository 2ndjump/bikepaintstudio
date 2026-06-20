import { useState } from 'react';
import { useDesignStore, newLayerId } from '../../state/designStore';
import type { DuplicateOptions } from '../../state/designStore';
import type { BlendMode, Layer } from '../../state/types';
import { PatternLayerEditor } from '../LayerTypes/PatternLayer';
import { ImageLayerEditor } from '../LayerTypes/ImageLayer';
import { DecalLayerEditor } from '../LayerTypes/DecalLayer';
import { EffectEditor } from '../LayerTypes/EffectEditor';
import { useT } from '../../i18n/useT';

const EMPTY_LAYERS: Layer[] = [];

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

  function addPattern() {
    const layer: Layer = {
      id: newLayerId('pattern'),
      name: 'Pattern',
      type: 'pattern',
      pattern: 'hexagons',
      color: '#ffffff',
      scale: 10,
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
          scale: 1,
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

  return (
    <div className="space-y-3">
      <div className="m3-section-title">{t('layers')}</div>

      <div className="flex gap-1.5 flex-wrap">
        <button className="btn-mini" onClick={addPattern}>{t('addPattern')}</button>
        <button className="btn-mini" onClick={addImage}>{t('addImage')}</button>
        <button className="btn-mini" onClick={addDecal}>{t('addText')}</button>
      </div>

      <div className="space-y-2">
        {[...layers].reverse().map((layer) => (
          <div key={layer.id} className="m3-card-nested p-2.5 space-y-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  updateLayer(activeZone, layer.id, { visible: !layer.visible })
                }
                className="m3-icon-btn m3-icon-btn-sm"
                title={t('tooltipVisibility')}
              >
                {layer.visible ? '●' : '○'}
              </button>
              <input
                className="flex-1 min-w-0 bg-transparent text-sm outline-none border-b border-transparent focus:border-[var(--md-primary)]"
                value={layer.name}
                onChange={(e) =>
                  updateLayer(activeZone, layer.id, { name: e.target.value })
                }
              />
              <button
                className="m3-icon-btn m3-icon-btn-sm"
                onClick={() => reorderLayer(activeZone, layer.id, 1)}
                title={t('tooltipMoveUp')}
              >
                ▲
              </button>
              <button
                className="m3-icon-btn m3-icon-btn-sm"
                onClick={() => reorderLayer(activeZone, layer.id, -1)}
                title={t('tooltipMoveDown')}
              >
                ▼
              </button>
              <button
                className="m3-icon-btn m3-icon-btn-sm"
                onClick={() => setDuplicatingId(duplicatingId === layer.id ? null : layer.id)}
                title="Duplicate"
              >
                ⧉
              </button>
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

            <div className="pt-1 border-t border-[var(--md-outline-variant)]">
              <EffectEditor layer={layer} zoneId={activeZone} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
