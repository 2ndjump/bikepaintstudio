import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useDesignStore } from '../../state/designStore';
import type { DecalLayer, ZoneId } from '../../state/types';
import {
  ensureFontLoaded,
  getAllFontOptions,
  subscribeFonts,
  systemFontsAvailable,
  requestSystemFonts,
  uploadFontFile,
  type FontEntry,
} from '../../fonts/fontLoader';
import { useT } from '../../i18n/useT';
import { ColorPicker } from '../ui/ColorPicker';
import { FontPicker } from '../ui/FontPicker';

interface Props {
  layer: DecalLayer;
  zoneId: ZoneId;
}

function useFontOptions(): FontEntry[] {
  return useSyncExternalStore(subscribeFonts, getAllFontOptions, getAllFontOptions);
}


export function DecalLayerEditor({ layer, zoneId }: Props) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const t = useT();
  const fontOptions = useFontOptions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureFontLoaded(layer.font);
  }, [layer.font]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const family = await uploadFontFile(file);
    if (family) updateLayer(zoneId, layer.id, { font: family });
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={layer.text}
        onChange={(e) => updateLayer(zoneId, layer.id, { text: e.target.value })}
        placeholder={t('text')}
        className="m3-field text-sm"
      />
      <FontPicker
        value={layer.font}
        options={fontOptions}
        onChange={(font) => updateLayer(zoneId, layer.id, { font })}
      />

      <div className="flex gap-1">
        {systemFontsAvailable() && (
          <button
            type="button"
            onClick={() => requestSystemFonts()}
            className="m3-btn m3-btn-tonal m3-btn-sm flex-1"
          >
            {t('requestSystemFonts')}
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded px-2 py-1 border border-neutral-700"
        >
          {t('uploadFont')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ColorPicker
          value={layer.color}
          label={t('color')}
          onChange={(color) => updateLayer(zoneId, layer.id, { color })}
        />
        <ColorPicker
          value={layer.outlineColor}
          label={t('outline')}
          onChange={(outlineColor) => updateLayer(zoneId, layer.id, { outlineColor })}
        />
      </div>

      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        {t('size')} {layer.size}px
        <input
          type="range"
          min={8}
          max={256}
          step={1}
          value={layer.size}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, { size: parseFloat(e.target.value) })
          }
        />
      </label>
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        {t('outlineWidth')} {layer.outlineWidth}px
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={layer.outlineWidth}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, {
              outlineWidth: parseFloat(e.target.value),
            })
          }
        />
      </label>
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        Letter spacing {layer.letterSpacing}px
        <input
          type="range"
          min={-20}
          max={100}
          step={1}
          value={layer.letterSpacing}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, {
              letterSpacing: parseFloat(e.target.value),
            })
          }
        />
      </label>

      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        X {(layer.x * 100).toFixed(0)}%
        <input
          type="range"
          min={-1}
          max={2}
          step={0.01}
          value={layer.x}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, {
              x: parseFloat(e.target.value),
            })
          }
        />
      </label>
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        Y {(layer.y * 100).toFixed(0)}%
        <input
          type="range"
          min={-1}
          max={2}
          step={0.01}
          value={layer.y}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, {
              y: parseFloat(e.target.value),
            })
          }
        />
      </label>
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        {t('rotationShort')} {layer.rotation.toFixed(0)}°
        <input
          type="range"
          min={-180}
          max={180}
          step={15}
          value={layer.rotation}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, {
              rotation: parseFloat(e.target.value),
            })
          }
        />
      </label>
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        {t('letterRotation')} {layer.glyphRotation.toFixed(0)}°
        <input
          type="range"
          min={-180}
          max={180}
          step={15}
          value={layer.glyphRotation}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, {
              glyphRotation: parseFloat(e.target.value),
            })
          }
        />
      </label>
    </div>
  );
}
