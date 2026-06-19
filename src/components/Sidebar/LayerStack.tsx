import { useState } from 'react';
import { useDesignStore, newLayerId } from '../../state/designStore';
import type { DuplicateOptions } from '../../state/designStore';
import type { BlendMode, Layer } from '../../state/types';
import { PatternLayerEditor } from '../LayerTypes/PatternLayer';
import { ImageLayerEditor } from '../LayerTypes/ImageLayer';
import { DecalLayerEditor } from '../LayerTypes/DecalLayer';
import { DistortionLayerEditor } from '../LayerTypes/DistortionLayer';
import { useT } from '../../i18n/useT';

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
    <div className="mt-1 rounded border border-neutral-700 bg-neutral-800 p-2 space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-neutral-400">Duplicate options</div>
      <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
        <input
          type="checkbox"
          checked={opts.mirrorH}
          onChange={(e) => setOpts((o) => ({ ...o, mirrorH: e.target.checked }))}
        />
        Mirror horizontal
      </label>
      <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
        <input
          type="checkbox"
          checked={opts.mirrorV}
          onChange={(e) => setOpts((o) => ({ ...o, mirrorV: e.target.checked }))}
        />
        Mirror vertical
      </label>
      <div className="flex gap-1 pt-0.5">
        <button
          onClick={confirm}
          className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded px-2 py-1"
        >
          Duplicate
        </button>
        <button
          onClick={onClose}
          className="text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded px-2 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function LayerStack() {
  const activeZone = useDesignStore((s) => s.activeZone);
  const layers = useDesignStore((s) => s.zones[s.activeZone].layers);
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

  function addDistortion() {
    const layer: Layer = {
      id: newLayerId('dist'),
      name: t('addDistortion').replace('+ ', ''),
      type: 'distortion',
      kind: 'gaussian',
      amount: 6,
      angle: 0,
      visible: true,
      opacity: 1,
      blendMode: 'normal',
    };
    addLayer(activeZone, layer);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-neutral-400">
          {t('layers')}
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        <button className="btn-mini" onClick={addPattern}>{t('addPattern')}</button>
        <button className="btn-mini" onClick={addImage}>{t('addImage')}</button>
        <button className="btn-mini" onClick={addDecal}>{t('addText')}</button>
        <button className="btn-mini" onClick={addDistortion}>{t('addDistortion')}</button>
      </div>

      <div className="space-y-2 mt-2">
        {[...layers].reverse().map((layer) => (
          <div
            key={layer.id}
            className="rounded border border-neutral-700 bg-neutral-900/70 p-2 space-y-2"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateLayer(activeZone, layer.id, { visible: !layer.visible })
                }
                className="text-xs w-6 text-center"
                title={t('tooltipVisibility')}
              >
                {layer.visible ? '●' : '○'}
              </button>
              <input
                className="flex-1 bg-transparent text-sm outline-none border-b border-transparent hover:border-neutral-600 focus:border-blue-500"
                value={layer.name}
                onChange={(e) =>
                  updateLayer(activeZone, layer.id, { name: e.target.value })
                }
              />
              <button
                className="text-xs text-neutral-400 hover:text-white"
                onClick={() => reorderLayer(activeZone, layer.id, 1)}
                title={t('tooltipMoveUp')}
              >
                ▲
              </button>
              <button
                className="text-xs text-neutral-400 hover:text-white"
                onClick={() => reorderLayer(activeZone, layer.id, -1)}
                title={t('tooltipMoveDown')}
              >
                ▼
              </button>
              <button
                className="text-xs text-neutral-400 hover:text-blue-400"
                onClick={() => setDuplicatingId(duplicatingId === layer.id ? null : layer.id)}
                title="Duplicate"
              >
                ⧉
              </button>
              <button
                className="text-xs text-neutral-400 hover:text-red-400"
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
              <label className="text-xs text-neutral-400 flex flex-col gap-1">
                Blend
                <select
                  value={layer.blendMode}
                  onChange={(e) =>
                    updateLayer(activeZone, layer.id, {
                      blendMode: e.target.value as BlendMode,
                    })
                  }
                  className="bg-neutral-800 text-neutral-100 text-xs rounded px-1 py-0.5 border border-neutral-700"
                >
                  {BLEND_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-neutral-400 flex flex-col gap-1">
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
            {layer.type === 'distortion' && (
              <DistortionLayerEditor layer={layer} zoneId={activeZone} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
